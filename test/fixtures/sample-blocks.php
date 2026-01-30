<?php
/**
 * Sample WordPress template file with block markup
 * Used for testing the block highlighting extension in PHP files
 */

get_header();
?>

<!-- wp:group {"align":"full","backgroundColor":"light-gray"} -->
<div class="wp-block-group alignfull has-light-gray-background-color">
    <?php if ( have_posts() ) : ?>
        <!-- wp:heading {"level":1} -->
        <h1><?php the_title(); ?></h1>
        <!-- /wp:heading -->

        <!-- wp:post-content /-->

    <?php else : ?>
        <!-- wp:paragraph {"className":"no-results"} -->
        <p class="no-results"><?php esc_html_e( 'No posts found.', 'theme' ); ?></p>
        <!-- /wp:paragraph -->
    <?php endif; ?>
</div>
<!-- /wp:group -->

<?php
// Blocks can appear in PHP output
$block_content = <<<HTML
<!-- wp:cover {"overlayColor":"primary","minHeight":400} -->
<div class="wp-block-cover has-primary-background-color" style="min-height:400px">
    <div class="wp-block-cover__inner-container">
        <!-- wp:heading {"textAlign":"center","level":2} -->
        <h2 class="has-text-align-center">Heredoc Block Content</h2>
        <!-- /wp:heading -->
    </div>
</div>
<!-- /wp:cover -->
HTML;

echo $block_content;
?>

<!-- wp:columns {"columns":3} -->
<div class="wp-block-columns">
    <?php for ( $i = 1; $i <= 3; $i++ ) : ?>
    <!-- wp:column -->
    <div class="wp-block-column">
        <!-- wp:paragraph -->
        <p>Dynamic column <?php echo esc_html( $i ); ?></p>
        <!-- /wp:paragraph -->

        <!-- wp:button {"backgroundColor":"secondary"} -->
        <div class="wp-block-button">
            <a class="wp-block-button__link has-secondary-background-color" href="<?php echo esc_url( get_permalink() ); ?>">
                <?php esc_html_e( 'Read More', 'theme' ); ?>
            </a>
        </div>
        <!-- /wp:button -->
    </div>
    <!-- /wp:column -->
    <?php endfor; ?>
</div>
<!-- /wp:columns -->

<?php
// WooCommerce-style product blocks
if ( class_exists( 'WooCommerce' ) ) :
?>
<!-- wp:woocommerce/product-grid {"columns":4,"rows":2,"categories":[]} -->
<div class="wp-block-woocommerce-product-grid">
    <!-- wp:woocommerce/product-image /-->
    <!-- wp:woocommerce/product-title /-->
    <!-- wp:woocommerce/product-price /-->
    <!-- wp:woocommerce/product-button /-->
</div>
<!-- /wp:woocommerce/product-grid -->
<?php endif; ?>

<!-- wp:spacer {"height":"80px"} /-->

<!-- wp:separator {"className":"is-style-dots"} /-->

<!-- wp:group {"tagName":"footer","className":"site-footer"} -->
<footer class="wp-block-group site-footer">
    <!-- wp:paragraph {"align":"center","fontSize":"small"} -->
    <p class="has-text-align-center has-small-font-size">
        &copy; <?php echo date( 'Y' ); ?> <?php bloginfo( 'name' ); ?>
    </p>
    <!-- /wp:paragraph -->

    <?php
    // Nested PHP within blocks
    if ( has_nav_menu( 'footer' ) ) :
    ?>
    <!-- wp:navigation {"ref":123,"layout":{"type":"flex","justifyContent":"center"}} /-->
    <?php endif; ?>
</footer>
<!-- /wp:group -->

<?php
// ACF blocks with complex attributes
$acf_block = '<!-- wp:acf/hero {"name":"acf/hero","data":{"title":"Welcome","subtitle":"To our site","background":{"url":"bg.jpg","alt":"Background"}},"mode":"preview"} -->';
?>

<!-- wp:query {"queryId":1,"query":{"perPage":5,"postType":"post"}} -->
<div class="wp-block-query">
    <!-- wp:post-template -->
        <!-- wp:post-title {"isLink":true} /-->
        <!-- wp:post-excerpt {"moreText":"Continue reading"} /-->
        <!-- wp:post-date /-->
    <!-- /wp:post-template -->

    <!-- wp:query-pagination -->
        <!-- wp:query-pagination-previous /-->
        <!-- wp:query-pagination-numbers /-->
        <!-- wp:query-pagination-next /-->
    <!-- /wp:query-pagination -->
</div>
<!-- /wp:query -->

<?php get_footer(); ?>
