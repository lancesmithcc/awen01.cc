<?php
define('WP_USE_THEMES', false);
require_once __DIR__ . '/../wp-load.php';
if (!current_user_can('edit_pages')) { http_response_code(403); die('Forbidden.'); }
$content = file_get_contents('/var/www/project/generated-pages/tools.html');
$existing = get_page_by_path('tools', OBJECT, 'page');
$data = ['post_title'=>'Tools','post_name'=>'tools','post_content'=>$content,'post_status'=>'publish','post_type'=>'page'];
if ($existing) { $data['ID'] = $existing->ID; $result = wp_update_post($data, true); $verb = 'Updated'; }
else { $result = wp_insert_post($data, true); $verb = 'Created'; }
echo "<h1>$verb</h1><p>Post ID: $result</p><p><a href='".get_permalink($result)."'>View →</a></p>";
