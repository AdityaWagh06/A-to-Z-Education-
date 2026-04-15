const express = require('express');
const router = express.Router();
const { supabase } = require('../config/supabase');

/**
 * Health Check Endpoint
 * GET /api/health
 * Returns status of API and database connectivity
 */
router.get('/', async (req, res) => {
  try {
    const health = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      checks: {
        api: 'running',
        database: 'checking...',
      },
      version: process.env.APP_VERSION || '1.0.0',
    };

    // Check database connectivity
    try {
      const { data, error } = await supabase
        .from('users')
        .select('count', { count: 'exact' })
        .limit(1);

      if (error) {
        health.checks.database = 'error';
        health.status = 'degraded';
      } else {
        health.checks.database = 'connected';
      }
    } catch (dbError) {
      health.checks.database = 'error';
      health.status = 'degraded';
    }

    res.json(health);
  } catch (error) {
    res.status(500).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      message: error.message,
    });
  }
});

/**
 * Database Schema Check Endpoint
 * GET /api/health/schema
 * Returns detailed schema validation
 * Protected: Admin only
 */
router.get('/schema', async (req, res) => {
  if (req.headers['x-api-key'] !== process.env.ADMIN_API_KEY && !req.user?.role === 'admin') {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const tableSchema = {
      users: [
        'id', 'name', 'email', 'google_id', 'role', 'standard',
        'progress', 'purchased_tests', 'purchased_standard_boxes',
        'mobile_no', 'picture', 'last_login_at', 'created_at', 'updated_at'
      ],
      videos: [
        'id', 'title', 'youtube_url', 'thumbnail', 'subject',
        'standard', 'duration', 'created_at'
      ],
      tests: [
        'id', 'title', 'subject', 'standard', 'price', 'questions',
        'time_limit', 'is_locked', 'pdf_path', 'answer_sheet_path', 'created_at'
      ],
      announcements: [
        'id', 'title', 'description', 'link', 'active', 'created_at'
      ],
      payments: [
        'id', 'user_id', 'test_id', 'box_id', 'payment_type',
        'standard_value', 'razorpay_order_id', 'razorpay_payment_id',
        'amount', 'status', 'created_at'
      ],
      paid_standard_boxes: [
        'id', 'standard', 'title', 'description', 'amount', 'is_active', 'created_at'
      ],
    };

    const results = {};
    const issues = [];

    for (const [tableName, requiredColumns] of Object.entries(tableSchema)) {
      try {
        const { data, error } = await supabase
          .from(tableName)
          .select('*')
          .limit(1);

        if (error) {
          results[tableName] = {
            status: 'missing',
            columns: 0,
            required: requiredColumns.length,
            missing: requiredColumns,
          };
          issues.push(`Table ${tableName} not found`);
        } else {
          const missingColumns = data && data.length > 0
            ? requiredColumns.filter(col => !(col in data[0]))
            : [];

          results[tableName] = {
            status: missingColumns.length === 0 ? 'ok' : 'incomplete',
            columns: requiredColumns.length - missingColumns.length,
            required: requiredColumns.length,
            missing: missingColumns,
          };

          if (missingColumns.length > 0) {
            issues.push(`Table ${tableName} missing: ${missingColumns.join(', ')}`);
          }
        }
      } catch (error) {
        results[tableName] = {
          status: 'error',
          error: error.message,
        };
        issues.push(`Error checking ${tableName}: ${error.message}`);
      }
    }

    res.json({
      timestamp: new Date().toISOString(),
      overallStatus: issues.length === 0 ? 'healthy' : 'unhealthy',
      tables: results,
      issues: issues,
      issueCount: issues.length,
    });
  } catch (error) {
    res.status(500).json({
      error: 'Schema check failed',
      message: error.message,
    });
  }
});

/**
 * Environment Check Endpoint
 * GET /api/health/env
 * Returns check of required environment variables
 * Protected: Admin only
 */
router.get('/env', async (req, res) => {
  if (req.headers['x-api-key'] !== process.env.ADMIN_API_KEY && !req.user?.role === 'admin') {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const requiredEnvVars = [
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
    'RAZORPAY_KEY_ID',
    'JWT_SECRET',
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
  ];

  const optionalEnvVars = [
    'SMTP_HOST',
    'SMTP_PORT',
    'SMTP_USER',
    'SMTP_FROM',
  ];

  const results = {
    required: {},
    optional: {},
    allRequiredPresent: true,
  };

  // Check required vars
  requiredEnvVars.forEach(varName => {
    const isPresent = !!process.env[varName];
    results.required[varName] = {
      present: isPresent,
      warning: !isPresent ? 'MISSING - App may not work' : null,
    };
    if (!isPresent) results.allRequiredPresent = false;
  });

  // Check optional vars
  optionalEnvVars.forEach(varName => {
    const isPresent = !!process.env[varName];
    results.optional[varName] = {
      present: isPresent,
      warning: !isPresent ? 'Not configured - Feature disabled' : null,
    };
  });

  res.json({
    timestamp: new Date().toISOString(),
    ...results,
  });
});

module.exports = router;
