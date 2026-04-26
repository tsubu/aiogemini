<?php
if (!defined('ABSPATH')) {
    exit;
}

/**
 * PicotAioOptimizer Media Handlers
 */
class PicotAioOptimizer_Media
{

    /**
     * Save Base64 Image to Media Library
     */
    public static function gar_upload_base64_image_to_wp($base64_data, $prompt_title)
    {
        $image_data = base64_decode($base64_data);
        if (!$image_data) {
            return new WP_Error('upload_error', 'Failed to decode base64 image');
        }

        $upload_dir = wp_upload_dir();
        $safe_name = sanitize_title($prompt_title);
        if (strlen($safe_name) > PICOT_AIO_OPTIMIZER_FILENAME_MAX_LENGTH) {
            $safe_name = substr($safe_name, 0, PICOT_AIO_OPTIMIZER_FILENAME_MAX_LENGTH);
        }
        $filename = 'picot_aio_optimizer-' . $safe_name . '-' . time() . '.png';
        $file_path = $upload_dir['path'] . '/' . $filename;

        // Save file
        if (false === file_put_contents($file_path, $image_data)) {
            return new WP_Error('upload_error', 'Failed to save image file');
        }

        // Check file type
        $wp_filetype = wp_check_filetype($filename, null);

        // Attachment info
        $attachment = array(
            'post_mime_type' => $wp_filetype['type'],
            'post_title'     => sanitize_text_field($prompt_title),
            'post_content'   => '',
            'post_status'    => 'inherit'
        );

        // Insert attachment
        $attach_id = wp_insert_attachment($attachment, $file_path);

        // Generate metadata
        require_once(ABSPATH . 'wp-admin/includes/image.php');
        $attach_data = wp_generate_attachment_metadata($attach_id, $file_path);
        wp_update_attachment_metadata($attach_id, $attach_data);

        return array(
            'attachment_id' => $attach_id,
            'url'           => wp_get_attachment_url($attach_id)
        );
    }
}
