<?php
if (!defined('ABSPATH')) {
    exit;
}

/**
 * PicotAioOptimizer Admin Views Class
 */
class PicotAioOptimizer_Admin_Views
{

    /**
     * Get localized strings for JavaScript
     */
    public static function get_localized_strings()
    {
        // AIO Gemini style: Use Japanese directly as primary strings
        return array(
            'analyzing' => esc_html__('分析中...', 'picot-aio-ai-content-optimizer'),
            'rewriting' => esc_html__('リライト中...', 'picot-aio-ai-content-optimizer'),
            'processing' => esc_html__('処理中...', 'picot-aio-ai-content-optimizer'),
            'discovering' => esc_html__('画像を提案中...', 'picot-aio-ai-content-optimizer'),
            'confirm_rewrite' => esc_html__('コンテンツをリライトしてもよろしいですか？現在のタイトルと本文が上書きされます。', 'picot-aio-ai-content-optimizer'),
            'success_rewrite' => esc_html__('リライトが完了しました！', 'picot-aio-ai-content-optimizer'),
            'error' => esc_html__('エラーが発生しました。', 'picot-aio-ai-content-optimizer'),
            'success' => esc_html__('分析が正常に完了しました', 'picot-aio-ai-content-optimizer'),
            'no_content' => esc_html__('コンテンツが見つかりません。', 'picot-aio-ai-content-optimizer'),
            'analyze_btn' => esc_html__('SEO/AIO分析', 'picot-aio-ai-content-optimizer'),
            'rewrite_btn' => esc_html__('AIリライト', 'picot-aio-ai-content-optimizer'),
            'controls_title' => esc_html__('操作パネル', 'picot-aio-ai-content-optimizer'),
            'plugin_title' => esc_html__('Picot AIO AI コンテンツ最適化', 'picot-aio-ai-content-optimizer'),
            'label_summary' => esc_html__('要約', 'picot-aio-ai-content-optimizer'),
            'label_structure' => esc_html__('構成分析', 'picot-aio-ai-content-optimizer'),
            'label_content_advice' => esc_html__('コンテンツのアドバイス', 'picot-aio-ai-content-optimizer'),
            'label_seo_advice' => esc_html__('SEOアドバイス', 'picot-aio-ai-content-optimizer'),
            'label_aio_advice' => esc_html__('AIOアドバイス', 'picot-aio-ai-content-optimizer'),
            'label_recommended' => esc_html__('推奨コンテンツ', 'picot-aio-ai-content-optimizer'),
            'label_titles' => esc_html__('SEOタイトル案', 'picot-aio-ai-content-optimizer'),
            'label_meta' => esc_html__('メタディスクリプション案', 'picot-aio-ai-content-optimizer'),
            'label_history' => esc_html__('この投稿の履歴を表示', 'picot-aio-ai-content-optimizer'),
            'discover_images_btn' => esc_html__('画像を提案', 'picot-aio-ai-content-optimizer'),
            'generate_btn' => esc_html__('生成', 'picot-aio-ai-content-optimizer'),
            'generating' => esc_html__('画像を生成中...', 'picot-aio-ai-content-optimizer'),
            'featured_image' => esc_html__('アイキャッチ画像', 'picot-aio-ai-content-optimizer'),
            'featured_image_prompt' => esc_html__('記事のアイキャッチ画像を生成', 'picot-aio-ai-content-optimizer'),
            'no_suggestions' => esc_html__('画像の提案が見つかりませんでした', 'picot-aio-ai-content-optimizer'),
            'gen_and_place' => esc_html__('生成して配置', 'picot-aio-ai-content-optimizer'),
            'gen_all' => esc_html__('一括生成して配置', 'picot-aio-ai-content-optimizer'),
            'save_date' => esc_html__('保存日時: ', 'picot-aio-ai-content-optimizer'),
            'featured_set' => esc_html__('アイキャッチ画像を設定しました！', 'picot-aio-ai-content-optimizer'),
            'placeholder_replaced' => esc_html__('プレースホルダーを画像に置き換えました！', 'picot-aio-ai-content-optimizer'),
            'image_inserted' => esc_html__('画像を挿入しました！', 'picot-aio-ai-content-optimizer'),
            'insert_failed' => esc_html__('画像の挿入に失敗しました。', 'picot-aio-ai-content-optimizer'),
            'batch_complete' => esc_html__('すべての画像生成が完了しました！', 'picot-aio-ai-content-optimizer'),
            'batch_progress' => esc_html__('生成中... ', 'picot-aio-ai-content-optimizer'),
            'batch_done' => esc_html__('完了！', 'picot-aio-ai-content-optimizer'),
            'thumbnail_label' => esc_html__('サムネイル用プロンプト', 'picot-aio-ai-content-optimizer'),
            'copied' => esc_html__('コピーしました！', 'picot-aio-ai-content-optimizer'),
            'loading_history' => esc_html__('履歴を読み込み中...', 'picot-aio-ai-content-optimizer'),
            'history_title' => esc_html__('分析履歴', 'picot-aio-ai-content-optimizer'),
            'show_btn' => esc_html__('表示', 'picot-aio-ai-content-optimizer'),
            'no_history' => esc_html__('この投稿の履歴はありません。', 'picot-aio-ai-content-optimizer'),
            'load_history_error' => esc_html__('履歴の読み込みに失敗しました。', 'picot-aio-ai-content-optimizer'),
            'analysis_result_title'             => esc_html__('分析結果', 'picot-aio-ai-content-optimizer'),
            'copy_btn'                           => esc_html__('コピー', 'picot-aio-ai-content-optimizer'),
            'clear_results_btn'                  => esc_html__('結果をクリア', 'picot-aio-ai-content-optimizer'),
            'api_error'                          => esc_html__('APIエラーが発生しました。', 'picot-aio-ai-content-optimizer'),
            'format_warning'                     => esc_html__('AIの応答形式が想定外です。テキストとして表示します。', 'picot-aio-ai-content-optimizer'),
            'rewrite_instructions_label'         => esc_html__('リライト指示', 'picot-aio-ai-content-optimizer'),
            'rewrite_instructions_placeholder'   => esc_html__('リライトの指示を入力（例：もっと親しみやすく、短く要約して、など）', 'picot-aio-ai-content-optimizer'),
            'results_placeholder'                => esc_html__('分析結果がここに表示されます。', 'picot-aio-ai-content-optimizer'),
            'permission_error'                   => esc_html__('権限エラーが発生しました。ページを更新してください。', 'picot-aio-ai-content-optimizer'),
            'server_error'                       => esc_html__('サーバーエラーが発生しました。エラーログを確認してください。', 'picot-aio-ai-content-optimizer'),
            'network_error'                      => esc_html__('ネットワークエラーが発生しました。接続を確認してください。', 'picot-aio-ai-content-optimizer'),
            'no_suggestions_near'                => esc_html__('適切な画像配置箇所が見つかりませんでした', 'picot-aio-ai-content-optimizer'),
            'fetching_models'                    => esc_html__('取得中...', 'picot-aio-ai-content-optimizer'),
            'fetch_models_done'                  => esc_html__('完了', 'picot-aio-ai-content-optimizer'),
            'fetch_models_error'                 => esc_html__('エラー', 'picot-aio-ai-content-optimizer'),
            'no_data'                            => esc_html__('（データなし）', 'picot-aio-ai-content-optimizer'),
        );
    }

    /**
     * Get image style options
     */
    public static function get_image_styles()
    {
        return array(
            'none' => array(esc_html__('なし（プロンプトのみ）', 'picot-aio-ai-content-optimizer'), ''),
            'professional' => array(esc_html__('プロフェッショナル（写真）', 'picot-aio-ai-content-optimizer'), 'Professional photography, highly detailed, sharp focus, 8k resolution'),
            'photo_realistic' => array(esc_html__('フォトリアル', 'picot-aio-ai-content-optimizer'), 'Ultra-realistic photo, cinematic lighting, masterpiece'),
            'flat_illustration' => array(esc_html__('フラットイラスト', 'picot-aio-ai-content-optimizer'), 'Flat design illustration, vibrant colors, clean lines, modern'),
            'isometric' => array(esc_html__('アイソメトリック', 'picot-aio-ai-content-optimizer'), 'Isometric illustration, 3D perspective, clean, tech style'),
            'vector_art' => array(esc_html__('ベクターアート', 'picot-aio-ai-content-optimizer'), 'Vector art style, precise, scalable look, bright colors'),
            'infographic' => array(esc_html__('インフォグラフィック', 'picot-aio-ai-content-optimizer'), 'Infographic style, data visualization, clean, informative'),
            'icon_style' => array(esc_html__('アイコン風', 'picot-aio-ai-content-optimizer'), 'Icon style illustration, simplified, symbolic, bold shapes'),
            'watercolor' => array(esc_html__('水彩画風', 'picot-aio-ai-content-optimizer'), 'Watercolor painting style, soft edges, flowing colors, artistic'),
            'oil_painting' => array(esc_html__('油絵風', 'picot-aio-ai-content-optimizer'), 'Oil painting style, rich textures, classical, museum quality'),
            'digital_art' => array(esc_html__('デジタルアート', 'picot-aio-ai-content-optimizer'), 'Digital art, vibrant colors, modern, creative'),
            'concept_art' => array(esc_html__('コンセプトアート', 'picot-aio-ai-content-optimizer'), 'Concept art style, imaginative, detailed, cinematic'),
            'sketch' => array(esc_html__('スケッチ風', 'picot-aio-ai-content-optimizer'), 'Pencil sketch style, hand-drawn, artistic, rough texture'),
            'render_3d' => array(esc_html__('3Dレンダリング', 'picot-aio-ai-content-optimizer'), '3D render, realistic materials, soft lighting, CGI quality'),
            'low_poly' => array(esc_html__('ローポリゴン', 'picot-aio-ai-content-optimizer'), 'Low poly 3D style, geometric, colorful facets, modern'),
            'clay_render' => array(esc_html__('クレイレンダリング', 'picot-aio-ai-content-optimizer'), 'Clay render style, matte finish, soft shadows, clean'),
            'neon_3d' => array(esc_html__('ネオン3D', 'picot-aio-ai-content-optimizer'), '3D render with neon lighting, glowing edges, futuristic'),
            'glassmorphism' => array(esc_html__('グラスモーフィズム', 'picot-aio-ai-content-optimizer'), 'Glassmorphism style, frosted glass, transparency, modern UI'),
            'gradient_mesh' => array(esc_html__('グラデーションメッシュ', 'picot-aio-ai-content-optimizer'), 'Gradient mesh style, smooth color transitions, abstract, vibrant'),
            'geometric' => array(esc_html__('ジオメトリック', 'picot-aio-ai-content-optimizer'), 'Geometric abstract, shapes, patterns, modern art'),
            'minimal' => array(esc_html__('ミニマリスト', 'picot-aio-ai-content-optimizer'), 'Minimalist design, white space, simple, elegant, less is more'),
            'brutalist' => array(esc_html__('ブルータリズム', 'picot-aio-ai-content-optimizer'), 'Brutalist design, raw, bold typography, unconventional'),
            'vintage' => array(esc_html__('ヴィンテージ', 'picot-aio-ai-content-optimizer'), 'Vintage style, retro colors, aged texture, nostalgic'),
            'cyberpunk' => array(esc_html__('サイバーパンク', 'picot-aio-ai-content-optimizer'), 'Cyberpunk style, neon colors, futuristic, dark urban'),
            'anime' => array(esc_html__('アニメ風', 'picot-aio-ai-content-optimizer'), 'Anime style illustration, Japanese animation, colorful, expressive'),
            'pixel_art' => array(esc_html__('ピクセルアート', 'picot-aio-ai-content-optimizer'), 'Pixel art style, 8-bit, retro gaming, blocky'),
            'paper_cut' => array(esc_html__('ペーパーカット', 'picot-aio-ai-content-optimizer'), 'Paper cut art style, layered, shadows, craft aesthetic'),
            'collage' => array(esc_html__('コラージュ', 'picot-aio-ai-content-optimizer'), 'Collage style, mixed media, cut-out elements, artistic'),
        );
    }

    /**
     * Get selected image style description
     */
    public static function get_selected_image_style_desc()
    {
        $image_style = get_option('picot_aio_optimizer_image_style', 'none');
        $styles = self::get_image_styles();
        return isset($styles[$image_style]) ? $styles[$image_style][1] : '';
    }

    /**
     * Render meta box for Classic Editor
     */
    public static function render_meta_box($post)
    {
?>
        <div id="picot_aio_optimizer-classic-editor-ui">
            <div style="margin-bottom:15px;">
                <div style="margin-bottom:10px;">
                    <button type="button" class="button button-primary" id="picot_aio_optimizer-classic-analyze" style="width:100%; height:40px; justify-content:center; display:flex; align-items:center;">
                        <?php echo esc_html(self::get_localized_strings()['analyze_btn']); ?>
                    </button>
                </div>
                <div style="margin-bottom:10px;">
                    <textarea id="picot_aio_optimizer-classic-instructions" style="width:100%; height:60px; margin-bottom:5px;" placeholder="<?php echo esc_attr(self::get_localized_strings()['rewrite_instructions_placeholder']); ?>"></textarea>
                    <button type="button" class="button button-secondary" id="picot_aio_optimizer-classic-rewrite" style="width:100%; height:40px; justify-content:center; display:flex; align-items:center;">
                        <?php echo esc_html(self::get_localized_strings()['rewrite_btn']); ?>
                    </button>
                </div>
                <div style="margin-bottom:10px;">
                    <button type="button" class="button button-secondary" id="picot_aio_optimizer-classic-discover-images" style="width:100%; height:40px; justify-content:center; display:flex; align-items:center;">
                        <?php echo esc_html(self::get_localized_strings()['discover_images_btn']); ?>
                    </button>
                </div>
            </div>
            <div id="picot_aio_optimizer-classic-results" style="padding:10px; background:#f9f9f9; border:1px solid #ddd; min-height:50px;">
                <p style="color:#666; font-style:italic;">
                    <?php echo esc_html(self::get_localized_strings()['results_placeholder']); ?>
                </p>
            </div>
        </div>
    <?php
    }

    /**
     * Admin settings page
     */
    public static function admin_page()
    {
        $api_key = get_option('picot_aio_optimizer_api_key', '');
        $model = get_option('picot_aio_optimizer_model', 'gemini-1.5-flash');
        $image_model = get_option('picot_aio_optimizer_image_model', 'gemini-2.0-flash-preview-image-generation');
        $enable_image_gen = get_option('picot_aio_optimizer_enable_image_gen', 0);
        $image_style = get_option('picot_aio_optimizer_image_style', 'none');
        $available_models = get_option('picot_aio_optimizer_available_models', array());
    ?>
        <div class="wrap picot-aio-optimizer-settings-wrap">
            <h1><?php esc_html_e('Picot AIO AI Content Optimizer 設定', 'picot-aio-ai-content-optimizer'); ?></h1>
            <?php
            if (current_user_can('manage_options') && filter_input(INPUT_GET, 'settings-updated') === 'true') {
                echo '<div class="notice notice-success is-dismissible"><p>' . esc_html__('設定を保存しました。', 'picot-aio-ai-content-optimizer') . '</p></div>';
            }
            ?>
            <form method="post" action="" class="picot-settings-form">
                <?php wp_nonce_field('picot_aio_optimizer_save_settings', 'picot_aio_optimizer_save_nonce'); ?>
                <input type="hidden" name="picot_aio_optimizer_manual_save" value="1">
                
                <div class="picot-settings-row">
                    <div class="picot-settings-label"><?php esc_html_e('Google Gemini APIキー', 'picot-aio-ai-content-optimizer'); ?></div>
                    <div class="picot-settings-field">
                        <input type="password" name="picot_aio_optimizer_api_key" value="<?php echo esc_attr($api_key); ?>" class="regular-text" autocomplete="off">
                        <p class="description">
                            <?php
                            echo wp_kses(
                                sprintf(
                                    /* translators: %s: URL to Google AI Studio */
                                    __('Google AI StudioからAPIキーを無料で取得できます。<a href="%s" target="_blank">こちらからキーを作成</a>して、上のフィールドに貼り付けてください。', 'picot-aio-ai-content-optimizer'),
                                    'https://aistudio.google.com/app/apikey'
                                ),
                                array('a' => array('href' => array(), 'target' => array()))
                            );
                            ?>
                        </p>
                    </div>
                </div>

                <div class="picot-settings-row">
                    <div class="picot-settings-label"><?php esc_html_e('分析用モデル', 'picot-aio-ai-content-optimizer'); ?></div>
                    <div class="picot-settings-field">
                        <select name="picot_aio_optimizer_model" id="picot_aio_optimizer_model">
                            <?php if (empty($available_models)) : ?>
                                <option value="gemini-1.5-flash" <?php selected($model, 'gemini-1.5-flash'); ?>>Gemini 1.5 Flash (推奨)</option>
                                <option value="gemini-1.5-pro" <?php selected($model, 'gemini-1.5-pro'); ?>>Gemini 1.5 Pro</option>
                                <option value="gemini-1.5-flash-8b" <?php selected($model, 'gemini-1.5-flash-8b'); ?>>Gemini 1.5 Flash-8B</option>
                                <option value="gemini-2.0-flash-exp" <?php selected($model, 'gemini-2.0-flash-exp'); ?>>Gemini 2.0 Flash Exp</option>
                                <option value="gemini-exp-1206" <?php selected($model, 'gemini-exp-1206'); ?>>Gemini Exp 1206</option>
                                <option value="gemini-2.0-flash-thinking-exp-1219" <?php selected($model, 'gemini-2.0-flash-thinking-exp-1219'); ?>>Gemini 2.0 Flash Thinking Exp</option>
                            <?php else : ?>
                                <?php foreach ($available_models as $m) :
                                    $m_id = str_replace('models/', '', $m['name']);
                                    $m_name = $m['displayName'] . ' (' . $m_id . ')';
                                    $m_methods = isset($m['supportedGenerationMethods']) ? $m['supportedGenerationMethods'] : array();
                                    if (in_array('generateContent', $m_methods) && strpos($m_id, 'image') === false && strpos(strtolower($m_id), 'banana') === false) :
                                ?>
                                        <option value="<?php echo esc_attr($m_id); ?>" <?php selected($model, $m_id); ?>><?php echo esc_html($m_name); ?></option>
                                <?php endif;
                                endforeach; ?>
                            <?php endif; ?>
                        </select>
                        <button type="button" class="button" id="picot_aio_optimizer_fetch_models"><?php esc_html_e('最新モデルリストを取得', 'picot-aio-ai-content-optimizer'); ?></button>
                        <span id="picot_aio_optimizer_fetch_status" style="margin-left: 10px;"></span>
                        <p class="description">
                            <?php esc_html_e('APIキーを保存した後、上のボタンを押すと最新の利用可能モデルをリストに追加できます。', 'picot-aio-ai-content-optimizer'); ?>
                        </p>
                    </div>
                </div>

                <div class="picot-settings-row">
                    <div class="picot-settings-label"><?php esc_html_e('画像生成機能', 'picot-aio-ai-content-optimizer'); ?></div>
                    <div class="picot-settings-field">
                        <label>
                            <input type="checkbox" name="picot_aio_optimizer_enable_image_gen" id="picot_aio_optimizer_enable_image_gen" value="1" <?php checked($enable_image_gen, 1); ?>>
                            <?php esc_html_e('有効にする', 'picot-aio-ai-content-optimizer'); ?>
                        </label>
                        <p class="description">
                            <?php esc_html_e('選択した画像モデルを使用して高品質な画像を生成します。', 'picot-aio-ai-content-optimizer'); ?>
                        </p>
                    </div>
                </div>

                <div id="picot_aio_optimizer_image_model_row" class="picot-settings-row" style="<?php echo $enable_image_gen ? '' : 'display:none;'; ?>">
                    <div class="picot-settings-label"><?php esc_html_e('画像生成用モデル', 'picot-aio-ai-content-optimizer'); ?></div>
                    <div class="picot-settings-field">
                        <select name="picot_aio_optimizer_image_model" id="picot_aio_optimizer_image_model">
                            <?php if (empty($available_models)) : ?>
                                <option value="imagen-3.0-generate-001" <?php selected($image_model, 'imagen-3.0-generate-001'); ?>>Imagen 3.0 Generate (最新)</option>
                                <option value="imagen-3.0-fast-generate-001" <?php selected($image_model, 'imagen-3.0-fast-generate-001'); ?>>Imagen 3.0 Fast Generate</option>
                                <option value="gemini-2.0-flash-preview-image-generation" <?php selected($image_model, 'gemini-2.0-flash-preview-image-generation'); ?>>Gemini 2.0 Flash (画像生成内蔵)</option>
                            <?php else : ?>
                                <?php foreach ($available_models as $m) :
                                    $m_id = str_replace('models/', '', $m['name']);
                                    $m_name = $m['displayName'] . ' (' . $m_id . ')';
                                    $m_methods = isset($m['supportedGenerationMethods']) ? $m['supportedGenerationMethods'] : array();
                                    if (in_array('imageGeneration', $m_methods) || strpos($m_id, 'image') !== false || strpos(strtolower($m_id), 'banana') !== false) :
                                ?>
                                        <option value="<?php echo esc_attr($m_id); ?>" <?php selected($image_model, $m_id); ?>><?php echo esc_html($m_name); ?></option>
                                <?php endif;
                                endforeach; ?>
                            <?php endif; ?>
                        </select>
                    </div>
                </div>

                <div id="picot_aio_optimizer_image_style_row" class="picot-settings-row" style="<?php echo $enable_image_gen ? '' : 'display:none;'; ?>">
                    <div class="picot-settings-label"><?php esc_html_e('画像スタイル', 'picot-aio-ai-content-optimizer'); ?></div>
                    <div class="picot-settings-field">
                        <?php $styles = self::get_image_styles(); ?>
                        <select name="picot_aio_optimizer_image_style" id="picot_aio_optimizer_image_style">
                            <?php foreach ($styles as $key => $style_data) : ?>
                                <option value="<?php echo esc_attr($key); ?>" <?php selected($image_style, $key); ?>>
                                    <?php echo esc_html($style_data[0]); ?>
                                </option>
                            <?php endforeach; ?>
                        </select>
                        <p class="description">
                            <?php esc_html_e('生成される画像のスタイルを選択します。プロンプトに自動的に追加されます。', 'picot-aio-ai-content-optimizer'); ?>
                        </p>
                    </div>
                </div>

                <div class="submit-row">
                    <?php submit_button(esc_html__('設定を保存', 'picot-aio-ai-content-optimizer')); ?>
                </div>
            </form>

            <hr>
            <div class="picot-history-wrap">
                <h2><?php esc_html_e('分析履歴', 'picot-aio-ai-content-optimizer'); ?></h2>
                <p><?php esc_html_e('直近20件の分析記録を表示しています。行をクリックすると詳細を表示します。', 'picot-aio-ai-content-optimizer'); ?></p>
                <div class="picot-history-list-header">
                    <div class="col-date"><?php esc_html_e('日付', 'picot-aio-ai-content-optimizer'); ?></div>
                    <div class="col-id"><?php esc_html_e('投稿ID', 'picot-aio-ai-content-optimizer'); ?></div>
                    <div class="col-summary"><?php esc_html_e('要約', 'picot-aio-ai-content-optimizer'); ?></div>
                    <div class="col-action"><?php esc_html_e('操作', 'picot-aio-ai-content-optimizer'); ?></div>
                </div>
                <div id="picot_aio_optimizer-history-list" class="picot-history-list-body">
                    <div class="picot-history-loading"><?php esc_html_e('読み込み中...', 'picot-aio-ai-content-optimizer'); ?></div>
                </div>
            </div>

            <!-- Modal for History Detail -->
            <div id="picot_aio_optimizer-modal" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.6); z-index:999999;">
                <div style="position:absolute; top:50%; left:50%; transform:translate(-50%, -50%); background:#fff; width:80%; max-width:800px; max-height:80vh; overflow:auto; border-radius:8px; box-shadow:0 4px 20px rgba(0,0,0,0.3);">
                    <div style="padding:20px; border-bottom:1px solid #ddd; background:#f0f0f1;">
                        <span id="picot_aio_optimizer-modal-close" style="float:right; cursor:pointer; font-size:24px; line-height:1;">&times;</span>
                        <h3 style="margin:0;" id="picot_aio_optimizer-modal-title"><?php esc_html_e('分析詳細', 'picot-aio-ai-content-optimizer'); ?></h3>
                    </div>
                    <div id="picot_aio_optimizer-modal-content" style="padding:20px;"></div>
                </div>
            </div>

        </div>
<?php
    }
}
