<?php
/**
 * UltraBGs — Contributors tab.
 * AI-assisted pack development: Claude skill, Codex skill, starter template.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

function ultrabgs_render_contributors_tab() {
	$dl = ULTRABGS_URL . 'assets/downloads/';
	?>
	<style>
		.ubgs-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 16px; max-width: 1040px; margin-top: 16px; }
		.ubgs-card { background: #fff; border: 1px solid #c3c4c7; border-radius: 4px; padding: 20px; }
		.ubgs-card h2 { margin-top: 0; }
		.ubgs-card code { font-size: 12px; }
		.ubgs-steps { margin: 12px 0 16px 18px; }
		.ubgs-steps li { margin-bottom: 6px; }
	</style>

	<p style="max-width:760px;">
		<?php esc_html_e( 'UltraBGs is built to be extended: animation packs install as ordinary WordPress plugins. The downloads below teach AI coding agents the full pack contract — frame inputs, house conventions, QA checklist — plus a complete worked example, so a contributor can go from idea to installable pack zip in one session.', 'ultrabgs' ); ?>
	</p>

	<div class="ubgs-cards">
		<div class="ubgs-card">
			<h2><?php esc_html_e( 'Claude Skill', 'ultrabgs' ); ?></h2>
			<p><?php esc_html_e( 'For Claude.ai, Claude Code, and Claude Cowork. Contains SKILL.md plus a starter template (Starfield) demonstrating every convention.', 'ultrabgs' ); ?></p>
			<ol class="ubgs-steps">
				<li><?php esc_html_e( 'Claude Code: unzip into .claude/skills/ in your project (or ~/.claude/skills/).', 'ultrabgs' ); ?></li>
				<li><?php esc_html_e( 'Claude.ai: upload the zip under Settings → Capabilities → Skills.', 'ultrabgs' ); ?></li>
				<li><?php esc_html_e( 'Then ask: “Build an UltraBGs pack that…”', 'ultrabgs' ); ?></li>
			</ol>
			<a class="button button-primary" href="<?php echo esc_url( $dl . 'ultrabgs-pack-builder-claude-skill.zip' ); ?>"><?php esc_html_e( 'Download Claude skill', 'ultrabgs' ); ?></a>
		</div>

		<div class="ubgs-card">
			<h2><?php esc_html_e( 'Codex Skill', 'ultrabgs' ); ?></h2>
			<p><?php esc_html_e( 'For OpenAI Codex (CLI and IDE). Contains AGENTS.md with the same contract and conventions, plus the starter template.', 'ultrabgs' ); ?></p>
			<ol class="ubgs-steps">
				<li><?php esc_html_e( 'Unzip into your pack project directory so AGENTS.md sits at the repo root (or merge into an existing AGENTS.md).', 'ultrabgs' ); ?></li>
				<li><?php esc_html_e( 'Run Codex in that directory — it picks up AGENTS.md automatically.', 'ultrabgs' ); ?></li>
			</ol>
			<a class="button button-primary" href="<?php echo esc_url( $dl . 'ultrabgs-pack-builder-codex-skill.zip' ); ?>"><?php esc_html_e( 'Download Codex skill', 'ultrabgs' ); ?></a>
		</div>

		<div class="ubgs-card">
			<h2><?php esc_html_e( 'Starter Pack Template', 'ultrabgs' ); ?></h2>
			<p><?php esc_html_e( 'The Starfield example as a ready-to-install plugin zip — install it to see a contributed pack working end-to-end, or use it as a hand-coding scaffold.', 'ultrabgs' ); ?></p>
			<p><code>ubgs-starfield/ubgs-starfield.php</code><br><code>ubgs-starfield/js/starfield.js</code></p>
			<a class="button" href="<?php echo esc_url( $dl . 'ubgs-starfield-starter.zip' ); ?>"><?php esc_html_e( 'Download starter template', 'ultrabgs' ); ?></a>
		</div>
	</div>

	<h2 style="margin-top:32px;"><?php esc_html_e( 'Pack contract at a glance', 'ultrabgs' ); ?></h2>
	<p style="max-width:760px;">
		<?php esc_html_e( 'A pack is one PHP filter plus one JS file. PHP registers the pack id, label and script URL via the ultrabgs_packs filter; the JS calls UltraBGs.registerPack({ id, init, render }). Every frame, render() receives unified input: cursor position and velocity, scroll position and velocity, and recent taps with their age — so cursor, scroll and tap interactivity come standard with zero event-handling code. Full documentation ships in DEVELOPERS.md inside the plugin folder.', 'ultrabgs' ); ?>
	</p>
	<?php
}
