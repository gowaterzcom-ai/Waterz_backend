// import cron from "node-cron";
// import Booking from "../models/Booking";

// // Run the job every minute
// const cleanupJob = cron.schedule("* * * * *", async () => {
//   try {
//     // Define the cutoff time (2 minutes ago)
//     console.log("Running cleanup job for pending bookings...");
//     const fifteenMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
//     // Delete bookings with paymentStatus 'pending' and created before the cutoff.
//     const result = await Booking.deleteMany({
//       paymentStatus: "pending",
//       createdAt: { $lt: fifteenMinutesAgo }
//     });
//     console.log("here is the booking :", result);
//     console.log(`Cleanup job removed ${result.deletedCount} pending bookings.`);
//   } catch (error) {
//     console.error("Error in cleanup job:", error);
//   }
// });

// export default cleanupJob;



// import cron from "node-cron";
// import Booking from "../models/Booking";
// import User, { Agent, Owner } from "../models/User";
// import Yacht from "../models/Yacht";

// // Run the job every minute (testing mode: delete one pending booking only)
// const cleanupJob = cron.schedule("* * * * *", async () => {
//   try {
//     console.log("Running test cleanup job for a pending booking...");
//     // Define cutoff time (2 minutes ago)
//     const cutoffTime = new Date(Date.now() - 2 * 60 * 1000);

//     // Find one booking with paymentStatus "pending" created before cutoff and populate yacht (to get the owner)
//     const bookingToDelete = await Booking.findOne({
//       paymentStatus: "pending",
//       createdAt: { $lt: cutoffTime }
//     }).populate("yacht");

//     if (!bookingToDelete) {
//       console.log("No pending booking found for test cleanup.");
//       return;
//     }

//     const bookingId = bookingToDelete._id;
//     const userId = bookingToDelete.user;
//     const agentId = bookingToDelete.agent;
//     const yachtId = bookingToDelete.yacht;
//     const yacht_detail = await Yacht.findOne({ _id: yachtId });
//     const ownerId = yacht_detail?.owner;

//     // Remove booking reference from the User document
//     await User.updateOne({ _id: userId }, { $pull: { bookings: bookingId } });

//     // Remove booking reference from the Agent document (if any)
//     if (agentId) {
//       await Agent.updateOne({ _id: agentId }, { $pull: { bookings: bookingId } });
//     }

//     // Remove booking reference from the Owner document (if any)
//     if (ownerId) {
//       await Owner.updateOne({ _id: ownerId }, { $pull: { bookings: bookingId } });
//     }

//     // Now delete the booking document
//     const deleteResult = await Booking.deleteOne({ _id: bookingId });
//     console.log(`Test cleanup job removed booking ${bookingId}. Delete result:`, deleteResult);
//   } catch (error) {
//     console.error("Error in test cleanup job:", error);
//   }
// });

// export default cleanupJob;



import cron from "node-cron";
import Booking from "../models/Booking";
import User, { Agent, Owner } from "../models/User";
import Yacht from "../models/Yacht";

// Run the job every minute (production mode: delete all pending bookings older than cutoff)
const cleanupJob = cron.schedule("* * * * *", async () => {
  try {
    console.log("Running cleanup job for pending bookings...");
    // Define the cutoff time (e.g., 15 minutes ago)
    const cutoffTime = new Date(Date.now() - 2 * 60 * 1000);

    // Find all bookings with paymentStatus "pending" created before cutoff and populate yacht
    const bookingsToDelete = await Booking.find({
      paymentStatus: "pending",
      createdAt: { $lt: cutoffTime }
    }).populate("yacht");

    if (!bookingsToDelete.length) {
      console.log("No pending bookings found for cleanup.");
      return;
    }

    // Gather bookingIds, userIds, agentIds and fetch ownerIds from each booking’s yacht
    const bookingIds = bookingsToDelete.map(b => b._id);
    const userIds = bookingsToDelete.map(b => b.user);
    const agentIds = bookingsToDelete.filter(b => b.agent).map(b => b.agent);

    // For each booking, fetch the owner from the yacht using the same method as the test code
    const ownerIdsRaw = await Promise.all(
      bookingsToDelete.map(async booking => {
        // Note: booking.yacht is populated but we mimic your direct lookup via Yacht.findOne
        const yachtDetail = await Yacht.findOne({ _id: booking.yacht });
        return yachtDetail?.owner;
      })
    );
    // Remove any null/undefined and get unique ownerIds
    const ownerIds = [...new Set(ownerIdsRaw.filter(id => id != null))];

    // Remove booking references from User documents
    await User.updateMany(
      { _id: { $in: userIds } },
      { $pull: { bookings: { $in: bookingIds } } }
    );

    // Remove booking references from Agent documents (if any)
    if (agentIds.length) {
      await Agent.updateMany(
        { _id: { $in: agentIds } },
        { $pull: { bookings: { $in: bookingIds } } }
      );
    }

    // Remove booking references from Owner documents (if any)
    if (ownerIds.length) {
      await Owner.updateMany(
        { _id: { $in: ownerIds } },
        { $pull: { bookings: { $in: bookingIds } } }
      );
    }

    // Delete the booking documents
    const deleteResult = await Booking.deleteMany({ _id: { $in: bookingIds } });
    console.log(`Cleanup job removed ${deleteResult.deletedCount} pending bookings.`);
  } catch (error) {
    console.error("Error in cleanup job:", error);
  }
});

export default cleanupJob;