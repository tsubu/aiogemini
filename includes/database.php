<?php
if (!defined('ABSPATH')) {
    exit;
}

/**
 * PicotAioOptimizer Database Handlers
 */
class PicotAioOptimizer_Database
{
    /**
     * Debug-aware error logging
     * Only logs in debug mode or for critical errors
     * 
     * @param string $message The error message to log
     * @param bool $critical Whether this is a critical error (always logged)
     * @return void
     */
    private static function log_error($message, $critical = false)
    {
        // Suppress logging in production to comply with WordPress.org guidelines
    }

    /**
     * Initialize Database Table for Logs
     * Creates table if not exists, adds missing indexes, and schedules cleanup
     * 
     * @global wpdb $wpdb WordPress database abstraction object
     * @return void
     */
    public static function gar_init_db()
    {
        global $wpdb;
        $table_name = $wpdb->prefix . 'picot_aio_optimizer_logs';
        $charset_collate = $wpdb->get_charset_collate();

        // Cache the table existence check for 24 hours to reduce direct DB calls
        $table_exists = get_transient('picot_aio_optimizer_table_exists');
        if (false === $table_exists) {
            $table_exists = ($wpdb->get_var($wpdb->prepare("SHOW TABLES LIKE %s", $table_name)) === $table_name); // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
            set_transient('picot_aio_optimizer_table_exists', $table_exists ? '1' : '0', DAY_IN_SECONDS);
        }

        if (!$table_exists || $table_exists === '0') {
            $sql = "CREATE TABLE {$wpdb->prefix}picot_aio_optimizer_logs (
                id bigint(20) NOT NULL AUTO_INCREMENT,
                post_id bigint(20) NOT NULL,
                advice_result longtext NOT NULL,
                created_at datetime DEFAULT CURRENT_TIMESTAMP NOT NULL,
                PRIMARY KEY  (id),
                KEY post_id (post_id),
                KEY created_at (created_at)
            ) $charset_collate;";

            require_once(ABSPATH . 'wp-admin/includes/upgrade.php');
            dbDelta($sql);
        }

        // Check and add missing index if needed (cached for 24h)
        $index_checked = get_transient('picot_aio_optimizer_index_checked');
        if (false === $index_checked) {
            $index_exists = $wpdb->get_results($wpdb->prepare("SHOW INDEX FROM {$wpdb->prefix}picot_aio_optimizer_logs WHERE Key_name = %s", 'created_at')); // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
            if (empty($index_exists)) {
                $wpdb->query("ALTER TABLE {$wpdb->prefix}picot_aio_optimizer_logs ADD KEY created_at (created_at)"); // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.DirectDatabaseQuery.SchemaChange
            }
            set_transient('picot_aio_optimizer_index_checked', '1', DAY_IN_SECONDS);
        }

        // Schedule daily cleanup (only if not already scheduled)
        if (!wp_next_scheduled('picot_aio_optimizer_cleanup_old_logs')) {
            wp_schedule_event(time(), 'daily', 'picot_aio_optimizer_cleanup_old_logs');
        }

        // Migrate data from old AIOGemini plugin if exists
        self::migrate_from_aiogemini();
    }

    /**
     * Migrate data from legacy AIOGemini plugin
     */
    private static function migrate_from_aiogemini()
    {
        global $wpdb;
        $old_table = $wpdb->prefix . 'aiogemini_logs';
        $new_table = $wpdb->prefix . 'picot_aio_optimizer_logs';

        // Skip if already migrated
        if (get_option('picot_aio_optimizer_migrated_from_aiogemini')) {
            return;
        }

        // Check if old table exists
        $table_exists = ($wpdb->get_var($wpdb->prepare("SHOW TABLES LIKE %s", $old_table)) === $old_table); // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- One-time migration check, no caching needed
        if (!$table_exists) {
            update_option('picot_aio_optimizer_migrated_from_aiogemini', '1');
            return;
        }

        // Table names cannot use placeholders in wpdb->prepare(); esc_sql() is the correct escaping method.
        $safe_new_table = esc_sql($new_table);
        $safe_old_table = esc_sql($old_table);
        $new_count = $wpdb->get_var("SELECT count(*) FROM `{$safe_new_table}`"); // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Table names cannot be parameterized; esc_sql() applied
        if ($new_count > 0) {
            update_option('picot_aio_optimizer_migrated_from_aiogemini', '1');
            return;
        }

        // Copy data (table names cannot be parameterized; esc_sql() applied)
        $wpdb->query("INSERT INTO `{$safe_new_table}` (post_id, advice_result, created_at) SELECT post_id, advice_result, created_at FROM `{$safe_old_table}`"); // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- esc_sql() applied to all table names

        update_option('picot_aio_optimizer_migrated_from_aiogemini', '1');
        self::log_error('Data migrated from AIOGemini successfully', false);
    }

    /**
     * Save Analysis Log
     * Stores analysis results in the database with proper error handling
     * 
     * @global wpdb $wpdb WordPress database abstraction object
     * @param int $post_id The post ID being analyzed
     * @param array|string $advice_result Analysis result (array will be JSON encoded)
     * @return int|false Insert ID on success, false on failure
     */
    public static function gar_save_analysis_log($post_id, $advice_result)
    {
        global $wpdb;
        $table_name = $wpdb->prefix . 'picot_aio_optimizer_logs';

        // Safely encode array to JSON with UTF-8 support
        if (is_array($advice_result)) {
            $json_result = json_encode($advice_result, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
            if ($json_result === false) {
                self::log_error('JSON encoding failed: ' . json_last_error_msg(), true);
                return false;
            }
            $advice_result = $json_result;
        }

        $result = $wpdb->insert( // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery
            $table_name,
            array(
                'post_id' => absint($post_id),
                'advice_result' => $advice_result,
                'created_at' => current_time('mysql')
            ),
            array('%d', '%s', '%s')
        );

        if ($result !== false) {
            wp_cache_delete('picot_aio_optimizer_history_' . $post_id, 'picot_aio_optimizer');
            wp_cache_delete('picot_aio_optimizer_history_all', 'picot_aio_optimizer');
        }

        return $wpdb->insert_id;
    }

    /**
     * Cleanup old logs based on retention period
     * Deletes logs older than the configured retention days
     * 
     * @global wpdb $wpdb WordPress database abstraction object
     * @return int|false Number of rows deleted, or false on error
     */
    public static function cleanup_old_logs()
    {
        global $wpdb;
        $table_name = $wpdb->prefix . 'picot_aio_optimizer_logs';
        $retention_days = defined('PICOT_AIO_OPTIMIZER_LOG_RETENTION_DAYS') ? PICOT_AIO_OPTIMIZER_LOG_RETENTION_DAYS : 90;

        $deleted = $wpdb->query( // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
            $wpdb->prepare(
                \"DELETE FROM {$wpdb->prefix}picot_aio_optimizer_logs WHERE created_at < DATE_SUB(NOW(), INTERVAL %d DAY)\",
                absint($retention_days)
            )
        );

        return $deleted;
    }
}
