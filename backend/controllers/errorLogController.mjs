import ErrorLog from '../models/ErrorLog.mjs';

// Get all error logs (admin)
export const getErrorLogs = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      errorType,
      severity,
      trainerId,
      resolved,
      dateFrom,
      dateTo,
    } = req.query;

    const skip = (page - 1) * limit;
    const query = {};

    if (errorType) query.errorType = errorType;
    if (severity) query.severity = severity;
    if (trainerId) query.trainerId = trainerId;
    if (resolved === 'true') {
      query.resolvedAt = { $ne: null };
    } else if (resolved === 'false') {
      query.resolvedAt = null;
    }

    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
      if (dateTo) query.createdAt.$lte = new Date(dateTo);
    }

    const logs = await ErrorLog.find(query)
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 })
      .populate('trainerId', 'firstName lastName email')
      .populate('uploadId', 'fileName uploadType');

    const total = await ErrorLog.countDocuments(query);

    // Calculate statistics
    const stats = {
      total,
      byType: {},
      bySeverity: {
        low: 0,
        medium: 0,
        high: 0,
        critical: 0,
      },
      unresolved: 0,
    };

    const allLogs = await ErrorLog.find(query);
    allLogs.forEach(log => {
      stats.byType[log.errorType] = (stats.byType[log.errorType] || 0) + 1;
      stats.bySeverity[log.severity]++;
      if (!log.resolvedAt) stats.unresolved++;
    });

    res.status(200).json({
      success: true,
      data: logs,
      stats,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get error logs error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch error logs',
      error: error.message,
    });
  }
};

// Get single error log details
export const getErrorLogDetail = async (req, res) => {
  try {
    const { errorId } = req.params;

    const errorLog = await ErrorLog.findById(errorId)
      .populate('trainerId', 'firstName lastName email phone')
      .populate('uploadId');

    if (!errorLog) {
      return res.status(404).json({
        success: false,
        message: 'Error log not found',
      });
    }

    res.status(200).json({
      success: true,
      data: errorLog,
    });
  } catch (error) {
    console.error('Get error log detail error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch error log',
      error: error.message,
    });
  }
};

// Mark error as resolved
export const resolveError = async (req, res) => {
  try {
    const { errorId } = req.params;
    const { resolution } = req.body;

    if (!resolution) {
      return res.status(400).json({
        success: false,
        message: 'Resolution details required',
      });
    }

    const errorLog = await ErrorLog.findByIdAndUpdate(
      errorId,
      {
        resolvedAt: new Date(),
        resolution,
      },
      { new: true }
    );

    if (!errorLog) {
      return res.status(404).json({
        success: false,
        message: 'Error log not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Error marked as resolved',
      data: errorLog,
    });
  } catch (error) {
    console.error('Resolve error log error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to resolve error',
      error: error.message,
    });
  }
};

// Get error statistics
export const getErrorStats = async (req, res) => {
  try {
    const { days = 30 } = req.query;

    const dateFrom = new Date();
    dateFrom.setDate(dateFrom.getDate() - parseInt(days));

    const logs = await ErrorLog.find({
      createdAt: { $gte: dateFrom },
    });

    const stats = {
      total: logs.length,
      byType: {},
      bySeverity: {
        low: 0,
        medium: 0,
        high: 0,
        critical: 0,
      },
      unresolved: logs.filter(l => !l.resolvedAt).length,
      byDate: {},
    };

    logs.forEach(log => {
      // Count by type
      stats.byType[log.errorType] = (stats.byType[log.errorType] || 0) + 1;

      // Count by severity
      stats.bySeverity[log.severity]++;

      // Count by date
      const date = log.createdAt.toISOString().split('T')[0];
      stats.byDate[date] = (stats.byDate[date] || 0) + 1;
    });

    res.status(200).json({
      success: true,
      data: stats,
      period: `Last ${days} days`,
    });
  } catch (error) {
    console.error('Get error stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch error statistics',
      error: error.message,
    });
  }
};

// Get critical errors requiring immediate action
export const getCriticalErrors = async (req, res) => {
  try {
    const errors = await ErrorLog.find({
      severity: 'critical',
      resolvedAt: null,
    })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('trainerId', 'firstName lastName email')
      .populate('uploadId', 'fileName');

    res.status(200).json({
      success: true,
      data: errors,
      count: errors.length,
    });
  } catch (error) {
    console.error('Get critical errors error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch critical errors',
      error: error.message,
    });
  }
};

// Delete old error logs (maintenance)
export const deleteOldErrorLogs = async (req, res) => {
  try {
    const { daysOld = 90 } = req.query;

    const dateLimit = new Date();
    dateLimit.setDate(dateLimit.getDate() - parseInt(daysOld));

    const result = await ErrorLog.deleteMany({
      createdAt: { $lt: dateLimit },
      resolvedAt: { $ne: null }, // Only delete resolved errors
    });

    res.status(200).json({
      success: true,
      message: `${result.deletedCount} old error logs deleted`,
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    console.error('Delete error logs error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete error logs',
      error: error.message,
    });
  }
};

export default {
  getErrorLogs,
  getErrorLogDetail,
  resolveError,
  getErrorStats,
  getCriticalErrors,
  deleteOldErrorLogs,
};
