<?php
/**
 * Plugin Name: Picot AIO AI Content Optimizer
 * Plugin URI: https://github.com/tsubu/aiogemini
 * Description: AI-powered content analysis and optimization plugin using Google Gemini API. Provides SEO advice, content recommendations, and automated image generation for WordPress posts and pages.
 * Version: 1.0.0
 * Author: PICOT
 * Author URI: https://picot.tokyo/
 * License: GPL v2 or later
 * License URI: https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain: picot-aio-ai-content-optimizer
 * Domain Path: /languages
 */

if (!defined('ABSPATH')) {
    exit;
}

// Define plugin version and path
define('PICOT_AIO_OPTIMIZER_VERSION', '1.0.0');
define('PICOT_AIO_OPTIMIZER_PATH', plugin_dir_path(__FILE__));
define('PICOT_AIO_OPTIMIZER_URL', plugin_dir_url(__FILE__));

// Configuration Constants
define('PICOT_AIO_OPTIMIZER_HISTORY_LIMIT', 20);              // int - Number of history items to display
define('PICOT_AIO_OPTIMIZER_FILENAME_MAX_LENGTH', 50);        // int - Maximum length for generated image filenames
define('PICOT_AIO_OPTIMIZER_IMAGE_DENSITY_THRESHOLD', 500);   // int - Reserved for future use
define('PICOT_AIO_OPTIMIZER_API_TIMEOUT', 120);               // int - Timeout in seconds for text generation API calls
define('PICOT_AIO_OPTIMIZER_IMAGE_API_TIMEOUT', 90);          // int - Timeout in seconds for image generation API calls
define('PICOT_AIO_OPTIMIZER_LOG_RETENTION_DAYS', 90);         // int - Number of days to retain analysis logs before auto-deletion

// Include required files
require_once PICOT_AIO_OPTIMIZER_PATH . 'includes/database.php';
require_once PICOT_AIO_OPTIMIZER_PATH . 'includes/gemini-client.php';
require_once PICOT_AIO_OPTIMIZER_PATH . 'includes/rest-handlers.php';
require_once PICOT_AIO_OPTIMIZER_PATH . 'includes/media.php';
require_once PICOT_AIO_OPTIMIZER_PATH . 'includes/admin-views.php';

/**
 * Main Plugin Class
 * Handles initialization, menu registration, and asset enqueuing
 */
class PicotAioOptimizer
{
    /**
     * Constructor
     */
    public function __construct()
    {
        add_action('admin_enqueue_scripts', array($this, 'enqueue_admin_scripts'));
        add_action('admin_menu', array($this, 'add_admin_menu'));
        add_action('rest_api_init', array($this, 'register_rest_routes'));
        add_action('init', array($this, 'load_textdomain'));

        // Admin AJAX for fetching models (legacy/fallback if needed)
        add_action('wp_ajax_picot_aio_optimizer_fetch_models', array('PicotAioOptimizer_REST_Handlers', 'fetch_models'));
    }

    /**
     * Load translation files
     */
    public function load_textdomain()
    {
        load_plugin_textdomain('picot-aio-ai-content-optimizer', false, dirname(plugin_basename(__FILE__)) . '/languages');
    }

    /**
     * Register Admin Menu
     */
    public function add_admin_menu()
    {
        add_options_page(
            'Picot AIO 設定',
            'Picot AIO 設定',
            'manage_options',
            'picot-aio-ai-content-optimizer',
            array('PicotAioOptimizer_Admin_Views', 'admin_page')
        );

        // Also add a sidebar meta box for Classic Editor
        add_action('add_meta_boxes', array($this, 'add_classic_meta_box'));
    }

    /**
     * Add Meta Box for Classic Editor
     */
    public function add_classic_meta_box()
    {
        $screens = array('post', 'page');
        foreach ($screens as $screen) {
            add_meta_box(
                'picot-aio-optimizer-meta-box',
                'Picot AIO AI Content Optimizer',
                array('PicotAioOptimizer_Admin_Views', 'render_meta_box'),
                $screen,
                'side',
                'high'
            );
        }
    }

    /**
     * Centralized logging for debug mode
     */
    public static function log($message)
    {
        if (defined('WP_DEBUG') && WP_DEBUG) {
            error_log('Picot AIO Optimizer: ' . (is_array($message) || is_object($message) ? print_r($message, true) : $message));
        }
    }

    /**
     * Register REST API routes
     */
    public function register_rest_routes()
    {
        $ns = 'picot_aio_optimizer/v1';

        register_rest_route($ns, '/analyze', array(
            'methods' => 'POST',
            'callback' => array('PicotAioOptimizer_REST_Handlers', 'analyze_content'),
            'permission_callback' => function () {
                return current_user_can('edit_posts');
            }
        ));

        register_rest_route($ns, '/rewrite', array(
            'methods' => 'POST',
            'callback' => array('PicotAioOptimizer_REST_Handlers', 'rewrite_article'),
            'permission_callback' => function () {
                return current_user_can('edit_posts');
            }
        ));

        register_rest_route($ns, '/suggest-images', array(
            'methods' => 'POST',
            'callback' => array('PicotAioOptimizer_REST_Handlers', 'suggest_images'),
            'permission_callback' => function () {
                return current_user_can('edit_posts');
            }
        ));

        register_rest_route($ns, '/generate-image', array(
            'methods' => 'POST',
            'callback' => array('PicotAioOptimizer_REST_Handlers', 'generate_image'),
            'permission_callback' => function () {
                return current_user_can('upload_files');
            }
        ));

        register_rest_route($ns, '/save-image-suggestions', array(
            'methods' => 'POST',
            'callback' => array('Picot_AIO_REST_Handlers', 'save_suggestions'),
            'permission_callback' => function () {
                return current_user_can('edit_posts');
            }
        ));

        register_rest_route($ns, '/load-image-suggestions', array(
            'methods' => 'GET',
            'callback' => array('Picot_AIO_REST_Handlers', 'load_suggestions'),
            'permission_callback' => function () {
                return current_user_can('edit_posts');
            }
        ));

        register_rest_route($ns, '/history', array(
            'methods' => 'GET',
            'callback' => array('PicotAioOptimizer_REST_Handlers', 'fetch_history'),
            'permission_callback' => function () {
                return current_user_can('edit_posts');
            }
        ));

        register_rest_route($ns, '/models', array(
            'methods' => 'GET',
            'callback' => array('PicotAioOptimizer_REST_Handlers', 'fetch_models'),
            'permission_callback' => function () {
                return current_user_can('manage_options');
            }
        ));
    }

    /**
     * Enqueue admin assets
     */
    public function enqueue_admin_scripts($hook)
    {
        // Only load on relevant pages
        if (!in_array($hook, array('post.php', 'post-new.php', 'settings_page_picot-aio-ai-content-optimizer'))) {
            return;
        }

        wp_enqueue_style('picot_aio_optimizer-admin-css', PICOT_AIO_OPTIMIZER_URL . 'admin/admin.css', array(), PICOT_AIO_OPTIMIZER_VERSION);

        // Core script with dependencies for Gutenberg sidebar support
        $dependencies = array('jquery', 'wp-plugins', 'wp-edit-post', 'wp-element', 'wp-components', 'wp-data', 'wp-editor', 'wp-api-fetch');
        wp_enqueue_script('picot_aio_optimizer-admin', PICOT_AIO_OPTIMIZER_URL . 'admin/admin.js', $dependencies, PICOT_AIO_OPTIMIZER_VERSION, true);

        // Add some helper styles to handle suggestion markers
        $inline_css = \"
            .picot_aio_optimizer-suggestion-marker { border: 2px dashed #3b82f6; padding: 15px; margin: 20px 0; border-radius: 8px; background: #f0f7ff; position: relative; }
            .picot_aio_optimizer-suggestion-marker strong { display: block; margin-bottom: 8px; color: #1d4ed8; }
            .suggestion-prompt { font-size: 11px; color: #64748b; margin-bottom: 12px; font-family: monospace; background: #fff; padding: 5px; border-radius: 4px; }
            .picot-aio-gen-btn { background: #3b82f6 !important; color: #fff !important; border: none !important; padding: 6px 12px !important; border-radius: 4px !important; cursor: pointer; font-size: 12px !important; font-weight: bold !important; margin-right: 10px !important; }
            .picot-aio-ignore-btn { background: #e2e8f0 !important; color: #475569 !important; border: none !important; padding: 6px 12px !important; border-radius: 4px !important; cursor: pointer; font-size: 12px !important; }
        \";
        wp_add_inline_style('picot_aio_optimizer-admin-css', $inline_css);

        // Localize data using the modern wp_add_inline_script approach for better compatibility with Gutenberg modules
        wp_add_inline_script('picot_aio_optimizer-admin', 'window.picot_aio_optimizer = ' . wp_json_encode(array(
            'ajax_url'                  => admin_url('admin-ajax.php'),
            'rest_url_rewrite'          => rest_url('picot_aio_optimizer/v1/rewrite'),
            'rest_url_analyze'          => rest_url('picot_aio_optimizer/v1/analyze'),
            'rest_url_history'          => rest_url('picot_aio_optimizer/v1/history'),
            'rest_url_generate_image'   => rest_url('picot_aio_optimizer/v1/generate-image'),
            'rest_url_suggest_images'   => rest_url('picot_aio_optimizer/v1/suggest-images'),
            'rest_url_save_suggestions' => rest_url('picot_aio_optimizer/v1/save-image-suggestions'),
            'rest_url_load_suggestions' => rest_url('picot_aio_optimizer/v1/load-image-suggestions'),
            'rest_url_models'           => rest_url('picot_aio_optimizer/v1/models'),
            'rest_nonce'                => wp_create_nonce('wp_rest'),
            'nonce'                     => wp_create_nonce('picot_aio_optimizer_nonce'),
            'enable_image_gen'          => (bool) get_option('picot_aio_optimizer_enable_image_gen', 0),
            'image_style_desc'          => PicotAioOptimizer_Admin_Views::get_selected_image_style_desc(),
            'debug_mode'                => (defined('WP_DEBUG') && WP_DEBUG),
            'strings'                   => PicotAioOptimizer_Admin_Views::get_localized_strings(),
        )), 'before');
    }

    /**
     * Plugin deactivation cleanup
     */
    public static function deactivate()
    {
        $timestamp = wp_next_scheduled('picot_aio_optimizer_cleanup_old_logs');
        if ($timestamp) {
            wp_unschedule_event($timestamp, 'picot_aio_optimizer_cleanup_old_logs');
        }
    }
}

// Plugin activation/deactivation hooks
register_activation_hook(__FILE__, array('PicotAioOptimizer_Database', 'gar_init_db'));
register_deactivation_hook(__FILE__, array('PicotAioOptimizer', 'deactivate'));

// Handle scheduled events
add_action('picot_aio_optimizer_cleanup_old_logs', array('PicotAioOptimizer_Database', 'cleanup_old_logs'));

// Initialize plugin
new PicotAioOptimizer();
