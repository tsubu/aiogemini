(function($) {
    'use strict';

    /**
     * Picot AIO AI Content Optimizer - Admin JS (React Integration)
     * Handles Gutenberg (Block Editor) and Classic Editor interfaces.
     */

    // Data passed from PHP via wp_add_inline_script
    const picotConfig = window.picot_aio_optimizer || {};
    const { 
        ajax_url, 
        rest_url_rewrite, 
        rest_url_analyze, 
        rest_url_history, 
        rest_url_generate_image, 
        rest_url_suggest_images, 
        rest_url_save_suggestions, 
        rest_url_load_suggestions, 
        rest_url_models, 
        rest_nonce, 
        nonce, 
        enable_image_gen, 
        image_style_desc, 
        debug_mode, 
        strings 
    } = picotConfig;

    // --- Helpers ---
    const log = (msg, data = null) => {
        if (debug_mode) {
            console.log(`[Picot AIO Debug] ${msg}`, data || '');
        }
    };

    /**
     * Get content from current editor (Gutenberg or Classic)
     */
    const getEditorContent = () => {
        // Gutenberg Detection
        if (window.wp && wp.data && wp.data.select('core/editor')) {
            return wp.data.select('core/editor').getEditedPostContent();
        }
        // Classic Editor (TinyMCE)
        if (window.tinyMCE && tinyMCE.activeEditor) {
            return tinyMCE.activeEditor.getContent();
        }
        // Classic Editor (Textarea Fallback)
        return $('#content').val() || '';
    };

    /**
     * Set content to current editor
     */
    const setEditorContent = (content) => {
        if (window.wp && wp.data && wp.data.dispatch('core/editor')) {
            wp.data.dispatch('core/editor').editPost({ content: content });
            return;
        }
        if (window.tinyMCE && tinyMCE.activeEditor) {
            tinyMCE.activeEditor.setContent(content);
            return;
        }
        $('#content').val(content);
    };

    /**
     * Get current post ID
     */
    const getPostId = () => {
        if (window.wp && wp.data && wp.data.select('core/editor')) {
            return wp.data.select('core/editor').getCurrentPostId();
        }
        return $('#post_ID').val();
    };

    /**
     * Safe Fetch Wrapper with Nonce
     */
    const secureFetch = async (url, options = {}) => {
        const defaultOptions = {
            headers: {
                'X-WP-Nonce': rest_nonce,
                'Content-Type': 'application/json'
            }
        };
        const mergedOptions = { ...defaultOptions, ...options };
        mergedOptions.headers = { ...defaultOptions.headers, ...options.headers };
        
        return fetch(url, mergedOptions);
    };

    // --- Gutenberg Integration (React Components) ---

    const initGutenbergSidebar = () => {
        const { registerPlugin } = wp.plugins;
        const { PluginSidebar, PluginSidebarMoreMenuItem } = wp.editPost;
        const { PanelBody, Button, TextareaControl, Spinner, Modal, Dashicon } = wp.components;
        const { Fragment, useState, useEffect, useCallback } = wp.element;
        const { useSelect } = wp.data;

        const SidebarContent = () => {
            const [advice, setAdvice] = useState(null);
            const [status, setStatus] = useState(strings.done);
            const [loading, setLoading] = useState(false);
            const [history, setHistory] = useState([]);
            const [rewriteInstruction, setRewriteInstruction] = useState('');
            const [isRewriteModalOpen, setIsRewriteModalOpen] = useState(false);
            const [imageSuggestions, setImageSuggestions] = useState([]);
            const [showHistory, setShowHistory] = useState(false);

            const postId = useSelect(select => select('core/editor').getCurrentPostId());
            const postTitle = useSelect(select => select('core/editor').getEditedPostAttribute('title'));

            const fetchHistory = useCallback(async () => {
                try {
                    const response = await secureFetch(`${rest_url_history}?post_id=${postId}`);
                    const res = await response.json();
                    if (res.success) setHistory(res.data);
                } catch (e) { log('History fetch error', e); }
            }, [postId]);

            const loadSuggestionsFromMeta = useCallback(async () => {
                try {
                    const response = await secureFetch(`${rest_url_load_suggestions}?post_id=${postId}`);
                    const res = await response.json();
                    if (res.success && res.data.suggestions) {
                        setImageSuggestions(res.data.suggestions);
                    }
                } catch (e) { log('Suggestions load error', e); }
            }, [postId]);

            useEffect(() => {
                if (postId) {
                    fetchHistory();
                    loadSuggestionsFromMeta();
                }
            }, [postId, fetchHistory, loadSuggestionsFromMeta]);

            const handleAnalyze = async () => {
                const content = getEditorContent();
                if (!content) { alert(strings.no_content); return; }

                setLoading(true);
                setStatus(strings.analyzing);
                try {
                    const response = await secureFetch(rest_url_analyze, {
                        method: 'POST',
                        body: JSON.stringify({ content: content, post_id: postId })
                    });
                    const res = await response.json();
                    if (res.success) {
                        setAdvice(res.data);
                        fetchHistory();
                    } else {
                        alert(res.message || strings.error);
                    }
                } catch (e) { alert(strings.error); }
                finally { setLoading(false); setStatus(strings.done); }
            };

            const handleSuggestImages = async () => {
                const content = getEditorContent();
                if (!content) { alert(strings.no_content); return; }

                setLoading(true);
                setStatus(strings.discovering);
                try {
                    const response = await secureFetch(rest_url_suggest_images, {
                        method: 'POST',
                        body: JSON.stringify({ content: content, title: postTitle })
                    });
                    const res = await response.json();
                    if (res.success) {
                        setImageSuggestions(res.data.suggestions);
                        injectSuggestionMarkers(res.data);
                    } else {
                        alert(res.message || strings.error);
                    }
                } catch (e) { alert(strings.error); }
                finally { setLoading(false); setStatus(strings.done); }
            };

            const handleRewrite = async () => {
                const content = getEditorContent();
                if (!content) { alert(strings.no_content); return; }

                setLoading(true);
                setStatus(strings.rewriting);
                try {
                    const response = await secureFetch(rest_url_rewrite, {
                        method: 'POST',
                        body: JSON.stringify({ 
                            content: content, 
                            title: postTitle,
                            instructions: rewriteInstruction 
                        })
                    });
                    const res = await response.json();
                    if (res.success) {
                        setEditorContent(res.data.content);
                        setIsRewriteModalOpen(false);
                        fetchHistory();
                        alert(strings.success_rewrite);
                    } else {
                        alert(res.message || strings.error);
                    }
                } catch (e) { alert(strings.error); }
                finally { setLoading(false); setStatus(strings.done); }
            };

            return (
                <PanelBody title={strings.plugin_title} initialOpen={true}>
                    <div className=\"picot-aio-optimizer-sidebar\">
                        
                        <div className=\"picot-controls-group\" style={{ marginBottom: '20px' }}>
                            <Button 
                                isPrimary 
                                onClick={handleAnalyze} 
                                disabled={loading} 
                                style={{ width: '100%', marginBottom: '10px', height: '40px', justifyContent: 'center' }}
                            >
                                {loading && status === strings.analyzing ? <Spinner /> : strings.analyze_btn}
                            </Button>

                            <Button 
                                isSecondary 
                                onClick={() => setIsRewriteModalOpen(true)} 
                                disabled={loading} 
                                style={{ width: '100%', marginBottom: '10px', height: '40px', justifyContent: 'center' }}
                            >
                                {strings.rewrite_btn}
                            </Button>

                            {enable_image_gen && (
                                <Button 
                                    isSecondary 
                                    onClick={handleSuggestImages} 
                                    disabled={loading} 
                                    style={{ width: '100%', marginBottom: '10px', height: '40px', justifyContent: 'center' }}
                                >
                                    {loading && status === strings.discovering ? <Spinner /> : strings.discover_images_btn}
                                </Button>
                            )}
                        </div>

                        {loading && <p style={{ textAlign: 'center', color: '#666', fontStyle: 'italic' }}>{status}</p>}

                        {advice && (
                            <div className=\"picot-advice-results\" style={{ background: '#f8fafc', padding: '15px', borderRadius: '8px', border: '1px solid #e2e8f0', marginTop: '20px' }}>
                                <h4 style={{ marginTop: 0, borderBottom: '2px solid #3b82f6', paddingBottom: '5px' }}>{strings.analysis_result_title}</h4>
                                
                                {advice.summary && (
                                    <div className=\"advice-section\">
                                        <strong>{strings.label_summary}</strong>
                                        <p style={{ fontSize: '12px', lineHeight: '1.5' }}>{advice.summary}</p>
                                    </div>
                                )}

                                {advice.seo_advice && (
                                    <div className=\"advice-section\">
                                        <strong>{strings.label_seo_advice}</strong>
                                        <ul style={{ paddingLeft: '15px', fontSize: '11px' }}>
                                            {advice.seo_advice.map((item, i) => <li key={i}>{item}</li>)}
                                        </ul>
                                    </div>
                                )}
                                
                                <Button isLink onClick={() => setAdvice(null)} style={{ fontSize: '11px', marginTop: '10px' }}>
                                    {strings.clear_results_btn}
                                </Button>
                            </div>
                        )}

                        <div className=\"picot-history-section\" style={{ marginTop: '30px', borderTop: '1px solid #ddd', paddingTop: '15px' }}>
                            <Button isLink onClick={() => setShowHistory(!showHistory)} style={{ width: '100%', textAlign: 'left', display: 'flex', justifyContent: 'space-between' }}>
                                <span><Dashicon icon=\"backup\" /> {strings.history_title}</span>
                                <Dashicon icon={showHistory ? 'arrow-up-alt2' : 'arrow-down-alt2'} />
                            </Button>
                            
                            {showHistory && (
                                <ul style={{ padding: 0, listStyle: 'none', marginTop: '10px' }}>
                                    {history.length === 0 ? (
                                        <li style={{ fontSize: '11px', color: '#999' }}>{strings.no_history}</li>
                                    ) : (
                                        history.map(item => (
                                            <li key={item.id} style={{ borderBottom: '1px solid #eee', padding: '8px 0' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <span style={{ fontSize: '10px', color: '#666' }}>{item.created_at}</span>
                                                    <Button isSmall onClick={() => {
                                                        try {
                                                            const data = JSON.parse(item.advice_result);
                                                            setAdvice(data);
                                                        } catch(e) { alert(strings.format_warning); }
                                                    }}>
                                                        {strings.show_btn}
                                                    </Button>
                                                </div>
                                            </li>
                                        ))
                                    )}
                                </ul>
                            )}
                        </div>

                        {isRewriteModalOpen && (
                            <Modal 
                                title={strings.rewrite_instructions_label} 
                                onRequestClose={() => setIsRewriteModalOpen(false)}
                                style={{ maxWidth: '500px' }}
                            >
                                <TextareaControl
                                    label={strings.rewrite_instructions_placeholder}
                                    value={rewriteInstruction}
                                    onChange={setRewriteInstruction}
                                    rows={5}
                                />
                                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
                                    <Button isSecondary onClick={() => setIsRewriteModalOpen(false)} style={{ marginRight: '10px' }}>
                                        キャンセル
                                    </Button>
                                    <Button isPrimary onClick={handleRewrite} disabled={loading}>
                                        {loading ? <Spinner /> : 'リライト実行'}
                                    </Button>
                                </div>
                            </Modal>
                        )}
                    </div>
                </PanelBody>
            );
        };

        registerPlugin('picot-aio-optimizer', {
            render: () => (
                <Fragment>
                    <PluginSidebarMoreMenuItem target=\"picot-aio-optimizer-sidebar\">
                        Picot AIO Optimizer
                    </PluginSidebarMoreMenuItem>
                    <PluginSidebar name=\"picot-aio-optimizer-sidebar\" title=\"Picot AIO\" icon=\"performance\">
                        <SidebarContent />
                    </PluginSidebar>
                </Fragment>
            )
        });
    };

    /**
     * Inject custom HTML markers into Gutenberg for visual image suggestions
     */
    const injectSuggestionMarkers = (payload) => {
        if (!window.wp || !wp.data || !payload.suggestions) return;

        log('Injecting markers', payload);
        const { suggestions } = payload;
        const blocks = wp.data.select('core/editor').getBlocks();
        const newBlocks = [...blocks];
        let injectedCount = 0;

        // Process body suggestions
        suggestions.forEach((sig, idx) => {
            // Find a block that contains sig.location
            for (let i = 0; i < newBlocks.length; i++) {
                const b = newBlocks[i];
                const bContent = b.attributes.content || '';
                if (bContent.includes(sig.location)) {
                    // Create a custom HTML block for the suggestion
                    const markerHtml = `
                        <div class=\"picot_aio_optimizer-suggestion-marker\" data-idx=\"${idx}\" data-prompt=\"${encodeURIComponent(sig.prompt)}\">
                            <strong>💡 ${strings.suggestion_title}: ${sig.description}</strong>
                            <p class=\"suggestion-prompt\">Prompt: ${sig.prompt}</p>
                            <button type=\"button\" class=\"picot-aio-gen-btn\" data-idx=\"${idx}\">${strings.generate_btn}</button>
                            <button type=\"button\" class=\"picot-aio-ignore-btn\" data-idx=\"${idx}\">無視</button>
                        </div>
                    `;
                    const markerBlock = wp.blocks.createBlock('core/html', { content: markerHtml });
                    newBlocks.splice(i + 1, 0, markerBlock);
                    injectedCount++;
                    break;
                }
            }
        });

        if (injectedCount > 0) {
            wp.data.dispatch('core/editor').resetBlocks(newBlocks);
            
            // Save suggestions to meta for persistence
            const postId = getPostId();
            secureFetch(rest_url_save_suggestions, {
                method: 'POST',
                body: JSON.stringify({ post_id: postId, suggestions: payload })
            });
        } else {
            alert(strings.no_suggestions_near);
        }
    };

    // --- Global Event Listeners for Suggestion Buttons ---

    $(document).on('click', '.picot-aio-gen-btn', async function(e) {
        e.preventDefault();
        const $btn = $(this);
        const $marker = $btn.closest('.picot_aio_optimizer-suggestion-marker');
        const prompt = decodeURIComponent($marker.data('prompt'));
        const postId = getPostId();

        $btn.prop('disabled', true).text(strings.generating);

        try {
            const response = await secureFetch(rest_url_generate_image, {
                method: 'POST',
                body: JSON.stringify({ 
                    prompt: prompt, 
                    post_id: postId, 
                    style_desc: image_style_desc 
                })
            });
            const res = await response.json();

            if (res.success) {
                replaceMarkerWithImage($marker, res.data.url, prompt);
            } else {
                alert(res.message || strings.error);
                $btn.prop('disabled', false).text(strings.generate_btn);
            }
        } catch (e) {
            alert(strings.error);
            $btn.prop('disabled', false).text(strings.generate_btn);
        }
    });

    $(document).on('click', '.picot-aio-ignore-btn', function(e) {
        e.preventDefault();
        const $marker = $(this).closest('.picot_aio_optimizer-suggestion-marker');
        removeMarker($marker);
    });

    const replaceMarkerWithImage = ($markerElement, imageUrl, altText) => {
        if (window.wp && wp.data) {
            const blocks = wp.data.select('core/editor').getBlocks();
            const markerIdx = $markerElement.data('idx');
            
            // Find and replace the HTML block
            const updatedBlocks = blocks.map(b => {
                if (b.name === 'core/html' && b.attributes.content && b.attributes.content.includes(`data-idx=\"${markerIdx}\"`)) {
                    return wp.blocks.createBlock('core/image', { url: imageUrl, alt: altText });
                }
                return b;
            });

            wp.data.dispatch('core/editor').resetBlocks(updatedBlocks);
        } else {
            // Classic Editor fallback
            const content = getEditorContent();
            const markerHtml = $markerElement[0].outerHTML;
            const imgHtml = `<figure class=\"wp-block-image size-large\"><img src=\"${imageUrl}\" alt=\"${altText}\"/></figure>`;
            setEditorContent(content.replace(markerHtml, imgHtml));
        }
    };

    const removeMarker = ($markerElement) => {
        if (window.wp && wp.data) {
            const blocks = wp.data.select('core/editor').getBlocks();
            const markerIdx = $markerElement.data('idx');
            const newBlocks = blocks.filter(b => {
                return !(b.name === 'core/html' && b.attributes.content && b.attributes.content.includes(`data-idx=\"${markerIdx}\"`));
            });
            wp.data.dispatch('core/editor').resetBlocks(newBlocks);
        } else {
            const content = getEditorContent();
            const markerHtml = $markerElement[0].outerHTML;
            setEditorContent(content.replace(markerHtml, ''));
        }
    };


    // --- Classic Editor Support ---

    const initClassicEditor = () => {
        log('Initializing Classic Editor UI Integration');
        
        const $results = $('#picot_aio_optimizer-classic-results');
        const $instructions = $('#picot_aio_optimizer-classic-instructions');

        const updateResults = (html) => {
            $results.html(html);
        };

        $('#picot_aio_optimizer-classic-analyze').on('click', async function() {
            const content = getEditorContent();
            const postId = getPostId();
            if (!content) { alert(strings.no_content); return; }

            const $btn = $(this);
            $btn.prop('disabled', true).text(strings.analyzing);
            updateResults('<p>...</p>');

            try {
                const response = await secureFetch(rest_url_analyze, {
                    method: 'POST',
                    body: JSON.stringify({ content: content, post_id: postId })
                });
                const res = await response.json();
                if (res.success) {
                    let html = `<h4>${strings.analysis_result_title}</h4>`;
                    if (res.data.summary) html += `<p><strong>${strings.label_summary}:</strong> ${res.data.summary}</p>`;
                    updateResults(html);
                } else {
                    alert(res.message || strings.error);
                }
            } catch (e) { alert(strings.error); }
            finally { $btn.prop('disabled', false).text(strings.analyze_btn); }
        });

        $('#picot_aio_optimizer-classic-rewrite').on('click', async function() {
            const content = getEditorContent();
            if (!content) { alert(strings.no_content); return; }
            if (!confirm(strings.confirm_rewrite)) return;

            const $btn = $(this);
            $btn.prop('disabled', true).text(strings.rewriting);

            try {
                const response = await secureFetch(rest_url_rewrite, {
                    method: 'POST',
                    body: JSON.stringify({ 
                        content: content, 
                        instructions: $instructions.val() 
                    })
                });
                const res = await response.json();
                if (res.success) {
                    setEditorContent(res.data.content);
                    alert(strings.success_rewrite);
                }
            } catch (e) { alert(strings.error); }
            finally { $btn.prop('disabled', false).text(strings.rewrite_btn); }
        });
    };


    // --- Settings Page Logic ---

    const initSettingsPage = () => {
        log('Initializing Settings Page Handlers');

        $('#picot_aio_optimizer_fetch_models').on('click', async function() {
            const $btn = $(this);
            const $status = $('#picot_aio_optimizer_fetch_status');
            
            $btn.prop('disabled', true);
            $status.text(strings.fetching_models);
            
            try {
                const response = await secureFetch(rest_url_models);
                const res = await response.json();
                if (res.success) {
                    const $select = $('#picot_aio_optimizer_model');
                    const currentVal = $select.val();
                    $select.empty();
                    res.data.forEach(m => {
                        const mId = m.name.replace('models/', '');
                        $select.append(`<option value=\"${mId}\">${m.displayName} (${mId})</option>`);
                    });
                    $select.val(currentVal);
                    $status.text(strings.fetch_models_done);
                } else {
                    $status.text(strings.fetch_models_error);
                }
            } catch (e) { $status.text(strings.fetch_models_error); }
            finally { $btn.prop('disabled', false); }
        });

        $('#picot_aio_optimizer_enable_image_gen').on('change', function() {
            const isChecked = $(this).is(':checked');
            $('#picot_aio_optimizer_image_model_row, #picot_aio_optimizer_image_style_row').toggle(isChecked);
        });

        // Load history on settings page
        const $historyList = $('#picot_aio_optimizer-history-list');
        if ($historyList.length) {
            (async () => {
                try {
                    const response = await secureFetch(`${rest_url_history}?limit=20`);
                    const res = await response.json();
                    if (res.success) {
                        $historyList.empty();
                        if (res.data.length === 0) {
                            $historyList.append(`<div style=\"padding:20px;text-align:center;color:#999;\">${strings.no_data}</div>`);
                        } else {
                            res.data.forEach(item => {
                                const $item = $(`
                                    <div class=\"picot-history-item\" data-id=\"${item.id}\">
                                        <div class=\"col-date\">${item.created_at}</div>
                                        <div class=\"col-id\">#${item.post_id}</div>
                                        <div class=\"col-summary\">-</div>
                                        <div class=\"col-action\"><button type=\"button\" class=\"button view-detail\">${strings.show_btn}</button></div>
                                    </div>
                                `);
                                $historyList.append($item);
                                
                                try {
                                    const parsed = JSON.parse(item.advice_result);
                                    if (parsed.summary) $item.find('.col-summary').text(parsed.summary);
                                    $item.find('.view-detail').on('click', () => showHistoryModal(item, parsed));
                                } catch(e) {}
                            });
                        }
                    }
                } catch(e) { $historyList.text(strings.error); }
            })();
        }

        const showHistoryModal = (item, data) => {
            const $modal = $('#picot_aio_optimizer-modal');
            const $content = $('#picot_aio_optimizer-modal-content');
            
            let html = `<strong>Post ID:</strong> ${item.post_id}<br><strong>Date:</strong> ${item.created_at}<hr>`;
            Object.keys(data).forEach(key => {
                if (Array.isArray(data[key])) {
                    html += `<h4>${key}</h4><ul>`;
                    data[key].forEach(li => html += `<li>${li}</li>`);
                    html += `</ul>`;
                } else {
                    html += `<h4>${key}</h4><p>${data[key]}</p>`;
                }
            });
            
            $content.html(html);
            $modal.show();
        };

        $('#picot_aio_optimizer-modal-close').on('click', () => $('#picot_aio_optimizer-modal').hide());
    };


    // --- Initializer ---

    $(function() {
        // Detect current context
        if ($('.picot-aio-optimizer-settings-wrap').length) {
            initSettingsPage();
        }

        if (window.wp && wp.editPost) {
            // Gutenberg Context
            wp.domReady(() => {
                initGutenbergSidebar();
            });
        } else if ($('#picot_aio_optimizer-classic-editor-ui').length) {
            // Classic Editor Context
            initClassicEditor();
        }
    });

})(jQuery);
