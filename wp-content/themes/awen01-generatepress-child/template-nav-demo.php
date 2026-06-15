<?php
/**
 * Template Name: Navigation Demo
 *
 * Redundant demo page showcasing AWEN01 navigation styles:
 * center-out bottom border hover, soft-drop subnav with blur,
 * and ripple subnav item feedback.
 */

defined( 'ABSPATH' ) || exit;

get_header();
?>

<style>
/* ═══════════════════════════════════════════
   Demo-page overrides — force the theme nav
   visible so we can show the effects even if
   the fixed block normally handles the header.
   ═══════════════════════════════════════════ */
.awen-nav-demo { max-width: 1120px; margin: 0 auto; padding: 40px clamp(18px,4vw,40px); }
.awen-nav-demo h1 { font-size: clamp(2rem,5vw,3.5rem); margin-bottom: .5rem; }
.awen-nav-demo .lede { color: var(--awen-muted); font-size: 1.125rem; line-height: 1.7; margin-bottom: 3rem; max-width: 640px; }

/* Demo cards */
.awen-nav-demo-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.5rem; margin: 3rem 0; }
.awen-nav-demo-card {
	background: color-mix(in srgb, var(--awen-panel) 72%, transparent);
	border: 1px solid color-mix(in srgb, var(--awen-fg) 12%, transparent);
	border-radius: 10px; padding: 1.75rem;
}
.awen-nav-demo-card h3 { font-size: 1.05rem; margin-bottom: .5rem; letter-spacing: .04em; text-transform: uppercase; color: var(--awen-accent); }
.awen-nav-demo-card p  { color: var(--awen-muted); font-size: .95rem; line-height: 1.65; margin: 0; }
.awen-nav-demo-card code { display: inline-block; margin-top: .75rem; font-size: .78rem; color: var(--awen-fg); background: color-mix(in srgb, var(--awen-panel) 60%, transparent); padding: .35rem .65rem; border-radius: 4px; }

/* ── Isolated demo nav (standalone, not in header) ── */
.awen-demo-nav-bar {
	display: flex; align-items: center; gap: 2rem;
	padding: 16px 0; margin: 2rem 0 3rem;
	border-bottom: 1px solid color-mix(in srgb, var(--awen-fg) 10%, transparent);
}
.awen-demo-nav-bar .demo-logo { font-weight: 700; font-size: 1.2rem; letter-spacing: .06em; text-transform: uppercase; white-space: nowrap; }
.awen-demo-nav { display: flex; list-style: none; margin: 0; padding: 0; gap: .25rem; }
.awen-demo-nav > li { position: relative; }
.awen-demo-nav > li > a {
	display: block; padding: 10px 18px; color: var(--awen-fg);
	font-weight: 700; font-size: .9rem; letter-spacing: .08em; text-transform: uppercase;
	text-decoration: none; position: relative; transition: color .25s ease;
}
.awen-demo-nav > li > a::after {
	content: ""; position: absolute; bottom: 0; left: 50%; width: 0; height: 2px;
	background: var(--awen-accent); border-radius: 1px;
	transition: width .35s cubic-bezier(.25,.8,.25,1), left .35s cubic-bezier(.25,.8,.25,1);
}
.awen-demo-nav > li > a:hover { color: var(--awen-accent); }
.awen-demo-nav > li > a:hover::after { width: 100%; left: 0; }

/* Demo subnav */
.awen-demo-nav .sub-menu {
	position: absolute; top: 100%; left: 0; min-width: 200px;
	list-style: none; margin: 0; padding: 22px;
	background: color-mix(in srgb, var(--awen-panel) 94%, transparent);
	border-radius: 22px; box-shadow: 0 12px 40px rgba(0,0,0,.32);
	backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
	border: 1px solid color-mix(in srgb, var(--awen-fg) 10%, transparent);
	opacity: 0; transform: translateY(12px);
	transition: opacity .28s ease, transform .28s cubic-bezier(.25,.8,.25,1);
	pointer-events: none;
}
.awen-demo-nav > li:hover > .sub-menu { opacity: 1; transform: translateY(0); pointer-events: auto; }
.awen-demo-nav .sub-menu li a {
	display: block; padding: 10px 22px; color: var(--awen-fg);
	border-radius: 14px;
	font-size: .88rem; text-decoration: none;
	transition: background .2s ease, padding-left .25s ease;
}
.awen-demo-nav .sub-menu li a:hover {
	background: color-mix(in srgb, var(--awen-accent) 18%, transparent);
	padding-left: 32px;
}
.awen-demo-nav .sub-menu .sub-menu { top: -8px; left: 100%; }

/* Scroll-indicator */
.awen-scroll-hint { text-align: center; color: var(--awen-muted); font-size: .85rem; margin-top: 4rem; animation: awen-bob 2s ease-in-out infinite; }
@keyframes awen-bob { 0%,100% { transform: translateY(0); } 50% { transform: translateY(6px); } }
</style>

<div class="awen-nav-demo">

	<h1>Navigation Design System</h1>
	<p class="lede">AWEN01 navigation primitives: center-out underline hover, soft-drop blurred subnav, and ripple item feedback. Every interaction uses the brand accent token and respects reduced-motion.</p>

	<!-- ═══ Isolated demo nav ═══ -->
	<div class="awen-demo-nav-bar">
		<span class="demo-logo">AWEN01</span>
		<ul class="awen-demo-nav">
			<li><a href="#">Work</a></li>
			<li>
				<a href="#">Music ▾</a>
				<ul class="sub-menu">
					<li><a href="#">Sonic Blessings</a></li>
					<li><a href="#">Initiation Tracks</a></li>
					<li><a href="#">Awen Om Mani Padme</a></li>
				</ul>
			</li>
			<li>
				<a href="#">Writing ▾</a>
				<ul class="sub-menu">
					<li><a href="#">Visionary Essays</a></li>
					<li>
						<a href="#">Manuscripts ▸</a>
						<ul class="sub-menu">
							<li><a href="#">The Luminous Codex</a></li>
							<li><a href="#">Threshold Notes</a></li>
							<li><a href="#">Fae Protocols</a></li>
						</ul>
					</li>
					<li><a href="#">Poetry</a></li>
				</ul>
			</li>
			<li><a href="#">Wisdom</a></li>
			<li><a href="#">Portal</a></li>
		</ul>
	</div>

	<!-- ═══ Explanation cards ═══ -->
	<div class="awen-nav-demo-grid">
		<div class="awen-nav-demo-card">
			<h3>Center-Out Underline</h3>
			<p>On hover, a 2px accent border grows from the center outward using a cubic-bezier curve. The active/current page shows the border persistently.</p>
			<code>::after with width 0→100% + left 50%→0</code>
		</div>
		<div class="awen-nav-demo-card">
			<h3>Soft-Drop Subnav</h3>
			<p>Dropdowns fade in while sliding down 12px with a blurred glass background, 12px border-radius, and a deep shadow — no harsh pop-in.</p>
			<code>opacity + translateY + backdrop-filter: blur</code>
		</div>
		<div class="awen-nav-demo-card">
			<h3>Ripple Item Hover</h3>
			<p>Subnav items shift right slightly and gain a translucent accent wash — subtle feedback that guides the eye without overwhelming.</p>
			<code>padding-left 22→32px + accent mix background</code>
		</div>
		<div class="awen-nav-demo-card">
			<h3>Nested Flyouts</h3>
			<p>Third-level menus appear to the right of their parent with the same soft-drop blur treatment — try hovering "Writing → Manuscripts" above.</p>
			<code>left: 100% on .sub-menu .sub-menu</code>
		</div>
		<div class="awen-nav-demo-card">
			<h3>Brand Token Driven</h3>
			<p>All colors reference <code>var(--awen-accent)</code>, <code>var(--awen-fg)</code>, and <code>var(--awen-panel)</code> — they automatically adapt to light, dark, and transcendent modes.</p>
		</div>
		<div class="awen-nav-demo-card">
			<h3>Respects Motion</h3>
			<p>All transitions collapse to 0.01ms when <code>prefers-reduced-motion: reduce</code> is active, keeping the experience accessible.</p>
		</div>
	</div>

	<p class="awen-scroll-hint">↓ The live theme navigation above also uses these same primitives ↓</p>

</div>

<?php get_footer(); ?>
