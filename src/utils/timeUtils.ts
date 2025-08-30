import { IYacht } from "../models/Yacht";

/**
 * Returns the effective price for a yacht service based on the booking's start time.
 * Non-peak: 8:00 AM (inclusive) to 5:00 PM (exclusive) IST.
 * Peak: Otherwise.
 *
 * @param yacht - The yacht object with pricing info.
 * @param serviceType - "sailing" or "anchoring".
 * @param date - The booking start Date. Defaults to current date.
 */
export const getEffectivePrice = (
  yacht: IYacht, 
  serviceType: 'sailing' | 'anchoring',
  date: Date = new Date()
): number => {
  // Convert booking time to IST time
  const istTime = new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  
  const hours = istTime.getHours();
  const minutes = istTime.getMinutes();
  const timeInMinutes = hours * 60 + minutes;
  
  // Non-peak defined between 8:00 AM and 5:00 PM
  const morningBoundary = 8 * 60;  // 480 minutes (8:00 AM)
  const eveningBoundary = 17 * 60; // 1020 minutes (5:00 PM)
  
  // Determine if booking time falls in non-peak; else it's peak
  const isNonPeak = timeInMinutes >= morningBoundary && timeInMinutes < eveningBoundary;
  
  return isNonPeak
    ? yacht.price[serviceType].nonPeakTime
    : yacht.price[serviceType].peakTime;
};