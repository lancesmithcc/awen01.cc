<?php

if (! defined('ABSPATH')) {
    exit;
}

class Stockboss_Rest
{
    private Stockboss_Options $options;
    private Stockboss_OpenRouter $openrouter;

    public function __construct(Stockboss_Options $options, Stockboss_OpenRouter $openrouter)
    {
        $this->options = $options;
        $this->openrouter = $openrouter;
    }

    public function register_routes(): void
    {
        register_rest_route(
            'stockboss/v1',
            '/generate-image',
            [
                'methods' => WP_REST_Server::CREATABLE,
                'callback' => [$this, 'generate_image'],
                'permission_callback' => [$this, 'can_generate_images'],
                'args' => [
                    'prompt' => [
                        'required' => true,
                        'type' => 'string',
                    ],
                    'useCustomSystemPrompt' => [
                        'required' => false,
                        'type' => 'boolean',
                    ],
                    'systemPrompt' => [
                        'required' => false,
                        'type' => 'string',
                    ],
                    'referenceImageIds' => [
                        'required' => false,
                        'type' => 'array',
                    ],
                ],
            ]
        );

        // Reports whether BrandBoss is present and which library categories it
        // exposes, so the editor can show the "Add to Brand Library" controls.
        register_rest_route(
            'stockboss/v1',
            '/brand-status',
            [
                'methods' => WP_REST_Server::READABLE,
                'callback' => [$this, 'brand_status'],
                'permission_callback' => [$this, 'can_generate_images'],
            ]
        );

        // Approve a generated image into the shared BrandBoss asset library.
        register_rest_route(
            'stockboss/v1',
            '/add-to-brand-library',
            [
                'methods' => WP_REST_Server::CREATABLE,
                'callback' => [$this, 'add_to_brand_library'],
                'permission_callback' => [$this, 'can_generate_images'],
                'args' => [
                    'attachmentId' => [
                        'required' => true,
                        'type' => 'integer',
                    ],
                    'category' => [
                        'required' => true,
                        'type' => 'string',
                    ],
                    'label' => [
                        'required' => false,
                        'type' => 'string',
                    ],
                    'prompt' => [
                        'required' => false,
                        'type' => 'string',
                    ],
                ],
            ]
        );
    }

    public function brand_status(): WP_REST_Response
    {
        $active = class_exists('BrandBoss_Bridge') && BrandBoss_Bridge::is_active();

        return new WP_REST_Response(
            [
                'active' => $active,
                'categories' => $active ? BrandBoss_Bridge::categories() : [],
            ],
            200
        );
    }

    public function add_to_brand_library(WP_REST_Request $request)
    {
        if (! class_exists('BrandBoss_Bridge') || ! BrandBoss_Bridge::is_active()) {
            return new WP_Error(
                'stockboss_no_brandboss',
                __('BrandBoss is not active, so there is no brand library to add to.', 'stockboss'),
                ['status' => 400]
            );
        }

        $attachment_id = (int) $request->get_param('attachmentId');
        if ($attachment_id <= 0 || get_post_type($attachment_id) !== 'attachment') {
            return new WP_Error('stockboss_bad_attachment', __('Invalid attachment.', 'stockboss'), ['status' => 400]);
        }
        if (! current_user_can('edit_post', $attachment_id) && ! current_user_can('read_post', $attachment_id)) {
            return new WP_Error('stockboss_forbidden', __('You cannot use this attachment.', 'stockboss'), ['status' => 403]);
        }

        $category = sanitize_key((string) $request->get_param('category'));

        $result = BrandBoss_Bridge::add_asset(
            $category,
            $attachment_id,
            [
                'label'  => sanitize_text_field((string) $request->get_param('label')),
                'prompt' => sanitize_textarea_field((string) $request->get_param('prompt')),
                'source' => 'stockboss',
            ]
        );

        if (is_wp_error($result)) {
            return $result;
        }

        return new WP_REST_Response(
            [
                'success' => true,
                'category' => $category,
                'attachmentId' => $attachment_id,
            ],
            200
        );
    }

    public function can_generate_images(): bool
    {
        return current_user_can('upload_files') && current_user_can('edit_posts');
    }

    public function generate_image(WP_REST_Request $request)
    {
        // Throttle paid AI generations per user to limit cost abuse.
        $limit = (int) apply_filters('stockboss_generations_per_hour', 60);
        if ($limit > 0) {
            $user_id = get_current_user_id();
            $key     = 'stockboss_rl_' . $user_id;
            $count   = (int) get_transient($key);
            if ($count >= $limit) {
                return new WP_Error(
                    'stockboss_rate_limited',
                    sprintf(__('Generation limit reached (%d/hour). Try again later.', 'stockboss'), $limit),
                    ['status' => 429]
                );
            }
            set_transient($key, $count + 1, HOUR_IN_SECONDS);
        }

        $result = $this->openrouter->generate_and_store([
            'prompt' => $request->get_param('prompt'),
            'useCustomSystemPrompt' => (bool) $request->get_param('useCustomSystemPrompt'),
            'systemPrompt' => $request->get_param('systemPrompt'),
            'referenceImageIds' => $request->get_param('referenceImageIds'),
        ]);

        if (is_wp_error($result)) {
            return $result;
        }

        return new WP_REST_Response(
            [
                'success' => true,
                'attachmentId' => $result['attachmentId'],
                'url' => $result['url'],
                'requestedModel' => $result['requestedModel'] ?? null,
                'modelUsed' => $result['modelUsed'] ?? null,
                'fallbackUsed' => ! empty($result['fallbackUsed']),
            ],
            200
        );
    }
}
