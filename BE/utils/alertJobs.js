const {
  notifyRentPickupSoon,
  notifyVoucherExpiringSoon,
} = require('../services/alert.dispatcher.service');

const ALERT_SCAN_INTERVAL_MS = Math.max(
  Number(process.env.ALERT_SCAN_INTERVAL_MS || 30 * 60 * 1000),
  60 * 1000
);

const runAlertScans = async () => {
  await Promise.allSettled([
    notifyRentPickupSoon(),
    notifyVoucherExpiringSoon(),
  ]);
};

const startAlertJobs = () => {
  runAlertScans().catch((error) => {
    console.error('[AlertJobs] initial run failed:', error?.message || error);
  });

  setInterval(() => {
    runAlertScans().catch((error) => {
      console.error('[AlertJobs] scan failed:', error?.message || error);
    });
  }, ALERT_SCAN_INTERVAL_MS);
};

module.exports = {
  startAlertJobs,
  runAlertScans,
};
