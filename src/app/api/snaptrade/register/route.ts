import { NextResponse } from "next/server";
import { registerSnapTradeUser } from "@/utils/snaptrade";
import { createClient } from "@/supabase/server";
import { snaptrade } from "@/utils/snaptrade-sdk";

// Set cache control headers to prevent caching
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(request: Request) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 },
      );
    }

    // Verify the user is authenticated
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: "User not authenticated" },
        { status: 401 },
      );
    }

    if (user.id !== userId) {
      return NextResponse.json({ error: "User ID mismatch" }, { status: 403 });
    }

    // Register the user with SnapTrade
    const snapTradeUser = await registerSnapTradeUser(userId);

    return NextResponse.json(
      { success: true, userId: snapTradeUser.userId },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0, must-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      },
    );
  } catch (error) {
    console.error("Error registering SnapTrade user:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    return NextResponse.json(
      { error: errorMessage },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store, max-age=0, must-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const url = new URL(request.url);
    const userId = url.searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 },
      );
    }

    // Verify the user is authenticated
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: "User not authenticated" },
        { status: 401 },
      );
    }

    if (user.id !== userId) {
      return NextResponse.json({ error: "User ID mismatch" }, { status: 403 });
    }

    // First get the existing broker_data to preserve any fields
    const { data: existingData } = await supabase
      .from("broker_connections")
      .select("broker_data, api_secret_encrypted")
      .eq("user_id", userId)
      .eq("broker_id", "snaptrade")
      .maybeSingle();

    const existingBrokerData = existingData?.broker_data || {};
    const userSecret = existingData?.api_secret_encrypted;

    // Try to delete the SnapTrade user, but don't fail if it doesn't work
    if (userSecret) {
      try {
        // First try to delete with the user secret
        await snaptrade.authentication.deleteSnapTradeUser({
          userId: userId,
          userSecret: userSecret,
        });
        console.log(
          `Successfully deleted SnapTrade user ${userId} with user secret`,
        );
      } catch (deleteWithSecretError) {
        console.warn(
          `Error deleting SnapTrade user with secret, trying without: ${deleteWithSecretError}`,
        );

        // If that fails, try without the user secret
        try {
          await snaptrade.authentication.deleteSnapTradeUser({
            userId: userId,
          });
          console.log(
            `Successfully deleted SnapTrade user ${userId} without user secret`,
          );
        } catch (deleteError) {
          console.warn(
            `Error deleting SnapTrade user, continuing anyway: ${deleteError}`,
          );
          // Continue with the process even if deletion fails
        }
      }
    } else {
      console.warn("No user secret found, skipping SnapTrade API deletion");
    }

    // Update the broker connection in the database to mark it as inactive
    const { error: dbError } = await supabase
      .from("broker_connections")
      .update({
        is_active: false,
        broker_data: {
          ...existingBrokerData,
          deleted_at: new Date().toISOString(),
          user_deleted: true,
        },
      })
      .eq("user_id", userId)
      .eq("broker_id", "snaptrade");

    if (dbError) {
      console.error("Error updating broker connection in database:", dbError);
      return NextResponse.json(
        { error: `Database error: ${dbError.message}` },
        { status: 500 },
      );
    }

    return NextResponse.json(
      { success: true, message: "SnapTrade user deleted successfully" },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0, must-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      },
    );
  } catch (error) {
    console.error("Error deleting SnapTrade user:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    return NextResponse.json(
      { error: errorMessage },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store, max-age=0, must-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      },
    );
  }
}
