<?php
if (!defined('ABSPATH')) {
    exit;
}

/**
 * PicotAioOptimizer REST Handlers Class
 */
class PicotAioOptimizer_REST_Handlers
{

    /**
     * Analyze Content handler
     */
    public static function analyze_content($request)
    {
        set_time_limit(0); // phpcs:ignore Squiz.PHP.DiscouragedFunctions.Discouraged -- Required for long-running AI API requests that exceed default PHP timeout

        $content = $request->get_param('content');
        $post_id = $request->get_param('post_id');
        
        PicotAioOptimizer::log("Analyze Content Request - Post ID: " . $post_id);

        $api_key = get_option('picot_aio_optimizer_api_key');
        $model = get_option('picot_aio_optimizer_model', 'gemini-1.5-flash');

        if (empty($api_key)) {
            PicotAioOptimizer::log("Error: Missing API Key");
            return new WP_Error('missing_api_key', 'Google Gemini API Key is not set in settings', array('status' => 400));
        }

        $result = PicotAioOptimizer_Client::call_gemini_api($content, $api_key, $model);

        if (is_wp_error($result)) {
            PicotAioOptimizer::log("API Error: " . $result->get_error_message());
            return $result;
        }

        // Save log to DB
        if (!empty($post_id)) {
            PicotAioOptimizer_Database::gar_save_analysis_log($post_id, $result);
            PicotAioOptimizer::log("Saved analysis result to DB for Post ID: " . $post_id);
        }

        return rest_ensure_response(array(
            'success' => true,
            'data' => $result
        ));
    }

    /**
     * Rewrite Article handler
     */
    public static function rewrite_article($request)
    {
        set_time_limit(0); // phpcs:ignore Squiz.PHP.DiscouragedFunctions.Discouraged -- Required for long-running AI API requests that exceed default PHP timeout

        try {
            $params = $request->get_json_params();
            $title = isset($params['title']) ? $params['title'] : $request->get_param('title');
            $content = isset($params['content']) ? $params['content'] : $request->get_param('content');
            $instructions = isset($params['instructions']) ? $params['instructions'] : $request->get_param('instructions', '');

            $api_key = get_option('picot_aio_optimizer_api_key');
            $model_id = get_option('picot_aio_optimizer_model', 'gemini-1.5-flash');
            $gen_img = get_option('picot_aio_optimizer_enable_image_gen', 0);

            PicotAioOptimizer::log("Rewrite Request - Title: " . $title . " | Instructions: " . $instructions);

            if (empty($api_key)) {
                PicotAioOptimizer::log("Error: Missing API Key in Rewrite");
                return new WP_Error('missing_api_key', 'API Key not set', array('status' => 400));
            }

            // UTF-8 Sanitization
            if (function_exists('mb_convert_encoding')) {
                if (!empty($content) && strlen($content) > 1000) {
                    $content = mb_convert_encoding($content, 'UTF-8', 'UTF-8');
                }
            }

            $full_prompt = "Title: {$title}\n\nContent: {$content}";
            $result = PicotAioOptimizer_Client::gar_call_gemini_api_rewrite($full_prompt, $api_key, $model_id, $gen_img, $instructions);
            
            if (is_wp_error($result)) {
                PicotAioOptimizer::log("Rewrite API Error: " . $result->get_error_message());
                return $result;
            }

            PicotAioOptimizer::log("Rewrite Successful");

            return rest_ensure_response(array(
                'success' => true,
                'data' => array(
                    'title' => $title,
                    'content' => isset($result['content']) ? $result['content'] : ''
                )
            ));
        } catch (Throwable $e) {
            PicotAioOptimizer::log("Fatal Error in Rewrite: " . $e->getMessage());
            return new WP_Error('fatal_error', 'PHP Fatal Error in Rewrite: ' . $e->getMessage() . ' in ' . $e->getFile() . ':' . $e->getLine(), array('status' => 500));
        }
    }

    /**
     * Suggest Images handler
     */
    public static function suggest_images($request)
    {
        set_time_limit(0); // phpcs:ignore Squiz.PHP.DiscouragedFunctions.Discouraged -- Required for long-running AI API requests that exceed default PHP timeout

        try {
            $params = $request->get_json_params();
            $title = isset($params['title']) ? $params['title'] : $request->get_param('title');
            $content = isset($params['content']) ? $params['content'] : $request->get_param('content');
            
            $api_key = get_option('picot_aio_optimizer_api_key');
            $model_id = get_option('picot_aio_optimizer_model', 'gemini-1.5-flash');

            PicotAioOptimizer::log("Suggest Images Request - Title: " . $title);

            if (empty($api_key)) {
                return new WP_Error('missing_api_key', 'API Key not set', array('status' => 400));
            }

            // UTF-8 Sanitization to prevent json_encode crashes (if mbstring is available)
            if (function_exists('mb_convert_encoding')) {
                if (!empty($content) && strlen($content) > 1000) {
                    $content = mb_convert_encoding($content, 'UTF-8', 'UTF-8');
                }
                if (!empty($title)) {
                    $title = mb_convert_encoding($title, 'UTF-8', 'UTF-8');
                }
            }

            // Try to extract existing thumbnail information from content
            $existing_thumb_prompt = '';
            // Match "サムネイル用プロンプト", "アイキャッチ用プロンプト", "サムネイルの内容", etc.
            if (preg_match('/(サムネイル|アイキャッチ)(用プロンプト|の内容)[：:](.+?)(?=\n|\[|$)/u', $content, $matches)) {
                $existing_thumb_prompt = trim($matches[3]);
            }

            // Detect article language from content/title to pass as context
            $locale = get_locale();
            $lang_code = substr($locale, 0, 2);

            // Build a universal system instruction that adapts to the article's language
            $system_instruction = "You are a visual editor for blog articles. Analyze the article and:
                1. Identify the language used in the article (e.g. Japanese, English, Chinese, etc.).
                2. Suggest a short, catchy text (max 10 characters in CJK, max 5 words in Latin) for the featured image thumbnail - written in THE SAME LANGUAGE as the article.
                3. Suggest up to 8 image placement opportunities within the article body.

                CRITICAL LANGUAGE RULE: All text that appears INSIDE generated images (featured_text, and any text rendered within prompts) MUST be written in THE SAME LANGUAGE as the article. Do NOT output English text inside images if the article is in Japanese, Chinese, Korean, etc.";

            if ($existing_thumb_prompt) {
                $system_instruction .= "\n\nEXISTING THUMBNAIL PROMPT FOUND IN ARTICLE:\n\"" . $existing_thumb_prompt . "\"\n**TOP PRIORITY**: Base the featured_text and featured_prompt on this existing prompt as faithfully as possible.\n";
            }

            $system_instruction .= "\n\nReturn ONLY a valid JSON object with this exact structure:
                {
                    \"featured_text\": \"Short catchy text for thumbnail image (in the article's language)\",
                    \"featured_prompt\": \"Detailed English prompt for featured image generation. IMPORTANT: Any text rendered IN the image must be in the article's language (NOT English if article is non-English).\",
                    \"suggestions\": [
                        {
                            \"location\": \"Exact quote from near the beginning of the article (15-30 chars)\",
                            \"description\": \"Description of image 1 (in article's language)\",
                            \"prompt\": \"English image generation prompt. IMPORTANT: Any text rendered IN the image must match the article's language.\"
                        },
                        {
                            \"location\": \"Exact quote from the middle of the article (15-30 chars)\",
                            \"description\": \"Description of image 2 (in article's language)\",
                            \"prompt\": \"English image generation prompt. IMPORTANT: Any text rendered IN the image must match the article's language.\"
                        }
                    ]
                }

                RULES:
                - Suggest up to 8 images maximum.
                - Do NOT suggest images at the very beginning of the article (first 2 paragraphs) - that position is reserved for the featured image.
                - Space images evenly throughout the article.
                - Each suggestion must include an exact text quote from the article as 'location'.
                - Return ONLY valid JSON, no markdown or extra text.
                - 'prompt' fields must be in English, but any text RENDERED IN the image must be in the same language as the article.";


            $full_text = "Title: {$title}\n\nContent: {$content}";

            // We use the rewrite helper logic but with different instruction
            $result = PicotAioOptimizer_Client::gar_perform_gemini_request($model_id, $api_key, $system_instruction, $full_text);

            if (is_wp_error($result)) {
                return $result;
            }

            $content_raw = $result['content'];
            // Clean trailing commas which are invalid in standard JSON
            $content_clean = preg_replace('/,\s*([\]\}])/', '$1', $content_raw);
            
            $parsed = json_decode($content_clean, true);
            if (json_last_error() !== JSON_ERROR_NONE) {
                // Fallback: try to clean markdown
                $clean = preg_replace('/^```json\s*|\s*```$/i', '', trim($content_raw));
                $clean = preg_replace('/,\s*([\]\}])/', '$1', $clean);
                $parsed = json_decode($clean, true);
            }

            // Normalize response structure
            $data = array(
                'featured_text'   => isset($parsed['featured_text']) ? $parsed['featured_text'] : '',
                'featured_prompt' => isset($parsed['featured_prompt']) ? $parsed['featured_prompt'] : '',
                'suggestions'     => isset($parsed['suggestions']) ? $parsed['suggestions'] : (isset($parsed[0]) ? $parsed : array())
            );

            return rest_ensure_response(array(
                'success' => true,
                'data'    => $data
            ));
        } catch (Throwable $e) {
            return new WP_Error('fatal_error', 'PHP Fatal Error: ' . $e->getMessage() . ' in ' . $e->getFile() . ':' . $e->getLine(), array('status' => 500));
        }
    }

    /**
     * Generate Image handler
     */
    public static function generate_image($request)
    {
        $prompt = $request->get_param('prompt');
        $api_key = get_option('picot_aio_optimizer_api_key');
        $image_model = get_option('picot_aio_optimizer_image_model', 'gemini-2.0-flash-preview-image-generation');

        if (empty($api_key)) {
            return new WP_Error('missing_api_key', 'API Key not set', array('status' => 400));
        }

        PicotAioOptimizer::log("Generate Image Request - Prompt: " . $prompt);

        $image_data = PicotAioOptimizer_Client::gar_generate_image_via_api($prompt, $api_key, $image_model);

        if (is_wp_error($image_data)) {
            PicotAioOptimizer::log("Generate Image API Error: " . $image_data->get_error_message());
            return $image_data;
        }

        PicotAioOptimizer::log("Image generated via API, uploading to media library...");
        $upload_result = PicotAioOptimizer_Media::gar_upload_base64_image_to_wp($image_data, $prompt);

        if (is_wp_error($upload_result)) {
            PicotAioOptimizer::log("Media Upload Error: " . $upload_result->get_error_message());
            return $upload_result;
        }

        PicotAioOptimizer::log("Image uploaded successfully - Attachment ID: " . (isset($upload_result['id']) ? $upload_result['id'] : 'N/A'));

        return rest_ensure_response(array(
            'success' => true,
            'data' => $upload_result
        ));
    }

    /**
     * Save Suggestions handler
     */
    public static function save_suggestions($request)
    {
        $post_id = $request->get_param('post_id');
        $suggestions_raw = $request->get_param('suggestions');

        if (empty($post_id)) {
            return new WP_Error('missing_post_id', 'Post ID required', array('status' => 400));
        }

        if (empty($suggestions_raw)) {
            delete_post_meta($post_id, '_picot_aio_optimizer_image_suggestions');
            delete_post_meta($post_id, '_picot_aio_optimizer_featured_text');
            delete_post_meta($post_id, '_picot_aio_optimizer_featured_prompt');
            delete_post_meta($post_id, '_picot_aio_optimizer_image_suggestions_updated');
            return rest_ensure_response(array('success' => true));
        }

        $parsed = is_string($suggestions_raw) ? json_decode($suggestions_raw, true) : $suggestions_raw;
        
        if (is_array($parsed) && isset($parsed['suggestions'])) {
            $suggestions = $parsed['suggestions'];
            $featured_text = isset($parsed['featured_text']) ? $parsed['featured_text'] : '';
            $featured_prompt = isset($parsed['featured_prompt']) ? $parsed['featured_prompt'] : '';
        } else {
            $suggestions = is_array($parsed) ? $parsed : array();
            $featured_text = '';
            $featured_prompt = '';
        }

        update_post_meta($post_id, '_picot_aio_optimizer_image_suggestions', wp_json_encode($suggestions));
        update_post_meta($post_id, '_picot_aio_optimizer_featured_text', $featured_text);
        update_post_meta($post_id, '_picot_aio_optimizer_featured_prompt', $featured_prompt);
        update_post_meta($post_id, '_picot_aio_optimizer_image_suggestions_updated', current_time('mysql'));

        return rest_ensure_response(array('success' => true));
    }

    /**
     * Load Suggestions handler
     */
    public static function load_suggestions($request)
    {
        $post_id = $request->get_param('post_id');
        if (empty($post_id)) {
            return new WP_Error('missing_post_id', 'Post ID is required', array('status' => 400));
        }

        $suggestions_meta = get_post_meta($post_id, '_picot_aio_optimizer_image_suggestions', true);
        $featured_text = get_post_meta($post_id, '_picot_aio_optimizer_featured_text', true);
        $featured_prompt = get_post_meta($post_id, '_picot_aio_optimizer_featured_prompt', true);
        $updated = get_post_meta($post_id, '_picot_aio_optimizer_image_suggestions_updated', true);

        $suggestions = is_string($suggestions_meta) ? json_decode($suggestions_meta, true) : $suggestions_meta;
        
        // Recover from old format where the entire payload was stored in 'suggestions'
        if (is_array($suggestions) && isset($suggestions['suggestions'])) {
            if (empty($featured_text) && isset($suggestions['featured_text'])) {
                $featured_text = $suggestions['featured_text'];
            }
            if (empty($featured_prompt) && isset($suggestions['featured_prompt'])) {
                $featured_prompt = $suggestions['featured_prompt'];
            }
            $suggestions = $suggestions['suggestions'];
        }

        if (empty($suggestions) || !is_array($suggestions)) {
            $suggestions = array();
        }

        return rest_ensure_response(array(
            'success' => true,
            'data' => array(
                'suggestions' => $suggestions,
                'featured_text' => $featured_text ? $featured_text : '',
                'featured_prompt' => $featured_prompt ? $featured_prompt : ''
            ),
            'updated' => $updated ? $updated : null
        ));
    }

    /**
     * Fetch History handler
     */
    public static function fetch_history($request)
    {
        global $wpdb;
        $post_id = $request->get_param('post_id');
        $limit = absint($request->get_param('limit') ?: PICOT_AIO_OPTIMIZER_HISTORY_LIMIT);

        $cache_key = 'picot_aio_optimizer_history_' . ($post_id ? $post_id : 'all') . '_' . $limit;
        $results = wp_cache_get($cache_key, 'picot_aio_optimizer');

        if (false === $results) {
            if (!empty($post_id)) {
                $results = $wpdb->get_results( // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery
                    $wpdb->prepare(
                        "SELECT * FROM {$wpdb->prefix}picot_aio_optimizer_logs WHERE post_id = %d ORDER BY created_at DESC LIMIT %d",
                        absint($post_id),
                        $limit
                    )
                );
            } else {
                $results = $wpdb->get_results( // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery
                    $wpdb->prepare(
                        "SELECT * FROM {$wpdb->prefix}picot_aio_optimizer_logs ORDER BY created_at DESC LIMIT %d",
                        $limit
                    )
                );
            }
            wp_cache_set($cache_key, $results, 'picot_aio_optimizer', 300); // Cache for 5 minutes
        }

        return rest_ensure_response(array(
            'success' => true,
            'data' => $results ? $results : array()
        ));
    }

    /**
     * Fetch Models handler
     */
    public static function fetch_models($request)
    {
        $api_key = get_option('picot_aio_optimizer_api_key');
        if (empty($api_key)) {
            return new WP_Error('missing_api_key', 'API Key not set', array('status' => 400));
        }

        $url = "https://generativelanguage.googleapis.com/v1beta/models?key={$api_key}";
        $response = wp_remote_get($url, array(
            'timeout' => 30,
        ));

        if (is_wp_error($response)) {
            return $response;
        }

        $body = wp_remote_retrieve_body($response);
        $data = json_decode($body, true);
        $models = isset($data['models']) ? $data['models'] : array();

        if (!empty($models)) {
            update_option('picot_aio_optimizer_available_models', $models);
        }

        return rest_ensure_response(array(
            'success' => true,
            'data' => $models
        ));
    }
}
