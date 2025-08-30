    // static async createAgentMultipleBooking(BookingDetails: Partial<IBookingAgent>): Promise<{booking: IBookingAgent, orderId: string }> {
    //   try {
    //     const { 
    //       startDate, 
    //       startTime, 
    //       location, 
    //       packages,
    //       PeopleNo, 
    //       addonServices,
    //       user, 
    //       yachts,
    //       customerEmail,
    //       customerName,
    //       customerPhone
    //     } = BookingDetails;
        
    //     if (!yachts) {
    //       throw new Error("Yachts are required");
    //     }
    //     // Get yacht details
    //     const yachtDetails = await Promise.all(
    //       yachts.map(async (yachtId) => {
    //         const yacht = await Yacht.findById(yachtId);
    //         if (!yacht) throw new Error(`Yacht ${yachtId} not found`);
    //         return yacht;
    //       })
    //     );
    //     const yachtNames = yachtDetails.map(yacht => yacht.name);
    //     const yachtImages = yachtDetails.map(yacht => yacht.images).flat();
    //     const numberOfYachts = yachtDetails.length;
    //   // Extract package times
    //   const getPackageDuration = (packageType: PackageType): { sailingHours: number, anchorageHours: number } => {
    //     const [sailing, anchoring] = packageType.split('_hour').map(part => {
    //       const match = part.match(/(\d+\.?\d*)/);
    //       return match ? parseFloat(match[0]) : 0;
    //     });
    //     return { sailingHours: sailing, anchorageHours: anchoring };
    //   };

    //   if (!packages) throw new Error("Packages are required");
    //   const { sailingHours, anchorageHours } = getPackageDuration(packages.type);
    //   const totalHours = sailingHours + anchorageHours;


    //   // Calculate dates
    //   const startDateTime = new Date(`${startDate}T${startTime}`);
    //   const endDateTime = new Date(startDateTime.getTime() + (totalHours * 60 * 60 * 1000));

    //   // Check total capacity
    //   const totalCapacity = yachtDetails.reduce((sum, yacht) => sum + yacht.capacity, 0);
    //   if (PeopleNo && PeopleNo > totalCapacity) {
    //     throw new Error("Number of people exceeds total yachts capacity");
    //   }

    //   // Check availability for all yachts
    //   await Promise.all(
    //     yachtDetails.map(async (yacht) => {
    //       const overlappingBookings = await Booking.find({
    //         yacht: yacht._id,
    //         status: 'confirmed',
    //         $or: [
    //           { startDate: { $lt: endDateTime }, endDate: { $gt: startDateTime } },
    //           { startDate: { $gte: startDateTime, $lt: endDateTime } },
    //           { endDate: { $gt: startDateTime, $lte: endDateTime } }
    //         ]
    //       });

    //       if (overlappingBookings.length > 0) {
    //         throw new Error(`Yacht ${yacht.name} is not available for selected time`);
    //       }
    //     })
    //   );
        
    //   // Calculate total amount
    //   const isPeakTime = true; // TODO: Implement peak time logic
    //   let totalAmount = yachtDetails.reduce((sum, yacht) => {
    //     const sailingPrice = isPeakTime ? yacht.price.sailing.peakTime : yacht.price.sailing.nonPeakTime;
    //     const anchoragePrice = isPeakTime ? yacht.price.anchoring.peakTime : yacht.price.anchoring.nonPeakTime;
    //     return sum + (sailingPrice * sailingHours) + (anchoragePrice * anchorageHours);
    //   }, 0);

    //   // Add addon services cost
    //   if (addonServices?.length) {
    //     const addonsCost = yachtDetails.reduce((sum, yacht) => {
    //       return sum + addonServices.reduce((addonSum, addon) => {
    //         const yachtAddon = yacht.addonServices.find(a => a.service === addon.service);
    //         return addonSum + (yachtAddon ? yachtAddon.pricePerHour * addon.hours : 0);
    //       }, 0);
    //     }, 0);
    //     totalAmount += addonsCost;
    //   }

    //   // Apply agent discount
    //   const agent = await Agent.findById(user);
    //   const agentDiscount = agent?.commissionRate ?? 0;
    //   const discountedAmount = totalAmount - (totalAmount * agentDiscount / 100);


    //   // Create booking
    //   const bookingAgent = new BookingAgent({
    //     ...BookingDetails,
    //     user,
    //     yachts,
    //     names: yachtNames,         // Add yacht names
    //     images: yachtImages,       // Add yacht images
    //     noOfYatchs: numberOfYachts, // Add number of yachts
    //     bookingDateTime: new Date(),
    //     location,
    //     packages,
    //     startDate: startDateTime,
    //     startTime: startDateTime,
    //     endDate: endDateTime,
    //     capacity: totalCapacity,
    //     PeopleNo,
    //     totalAmount: discountedAmount,
    //     customerEmail,
    //     customerName,
    //     isAgentBooking: true,
    //     customerPhone,
    //     addonServices: addonServices || [],
    //     paymentStatus: 'pending',
    //     status: 'confirmed',
    //     calendarSync: false
    //   });

    //     const options = {
    //       amount: discountedAmount * 100, 
    //       currency: "INR",
    //       //@ts-ignore
    //       receipt: bookingAgent._id.toString()
    //     };

    //     const order = await razorpay.orders.create(options);
    //     bookingAgent.razorpayOrderId = order.id;
    //     await bookingAgent.save();

    //   // Update owners and user
    //   await Promise.all([
    //     ...yachtDetails.map(yacht => 
    //       Owner.findByIdAndUpdate(yacht.owner, { $push: { bookings: bookingAgent._id } })
    //     ),
    //     User.findByIdAndUpdate(user, { $push: { bookings: bookingAgent._id } })
    //   ]);

    //   return { booking: bookingAgent, orderId: order.id };
    //   } catch (error) {
    //     throw new Error((error as Error).message);
    //   }
    // }



    // private static getPackageDuration(packageType: string): { sailingHours: number, anchorageHours: number, totalHours: number } {
    //     // Extract all numbers from the package string using regex.
    //     const numbers = packageType.match(/(\d+(\.\d+)?)/g);
    //     const sailing = numbers && numbers[0] ? parseFloat(numbers[0]) : 0;
    //     const anchorage = numbers && numbers[1] ? parseFloat(numbers[1]) : 0;
    //     return { sailingHours: sailing, anchorageHours: anchorage, totalHours: sailing + anchorage };
    //   }