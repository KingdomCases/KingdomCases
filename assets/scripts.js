/* ============================================================
  Initial variables
============================================================= */
var cart;
var cartLineItemCount;

/* ============================================================
  Initiate ShopifyBuy client
============================================================= */
var shopClient = ShopifyBuy.buildClient({
  accessToken: '9c5b87ac06e2577166d1c0912620c5f5',
  domain: 'justins-dropshiping-store.myshopify.com',
  appId: '6'
});

/* ============================================================
  Check to see if we have a cart stored in localstorage. If so,
  grab that one instead of starting a new one.
============================================================= */
if(localStorage.getItem('lastCartId')) {
  shopClient.fetchCart(localStorage.getItem('lastCartId')).then(function(remoteCart) {
    console.log('cart', remoteCart)
    cart = remoteCart;
    cartLineItemCount = remoteCart.lineItemCount;
  });
} else {
  shopClient.createCart().then(function (newCart) {
    cart = newCart;
    localStorage.setItem('lastCartId', cart.id);
    cartLineItemCount = newCart.lineItemCount;
  });
}

/* ============================================================
  Document ready for functions which require jQuery.
============================================================= */
$(function(){
  cartCount();
  $('.slideshow-section .slideshow').slick({
    slidesToShow: 1,
    slidesToScroll: 1,
    arrows: true,
    prevArrow: '<button type="button" class="slick-prev"><i class="fas fa-caret-left"></i></button>',
    nextArrow: '<button type="button" class="slick-next"><i class="fas fa-caret-left"></i></button>',
    fade: true,
    autoplay: true,
    autoplaySpeed: 4000
  });
});

/* ============================================================
  Checks the current cart count and applies it to the cart
  count in the header.
============================================================= */
function cartCount(){
  if(cartLineItemCount > 0){
    $('.cart-count').addClass('has-items').text(cartLineItemCount)
  }
}

function buildCart(){
  var cartLineItems = cart.lineItems.map(function (lineItem) {
    return '<div class="cart-row">\
      <div class="grid">\
        <div class="col-2">\
          <img src="'+lineItem.image.variants[5].src+'">\
        </div>\
        <div class="col-4">\
          <h3>'+lineItem.title+'</h3>\
          <p><em>'+lineItem.variant_title+'</em></p>\
        </div>\
        <div class="col-2 text-right">\
          <p class="cart-item">$'+lineItem.price+'</p>\
        </div>\
        <div class="col-2 text-right">\
          <input class="quantity" type="number" value="'+lineItem.quantity+'" data-variant-id="'+lineItem.variant_id+'" />\
        </div>\
        <div class="col-2 text-right">\
          <p class="cart-item">$'+lineItem.line_price+'</p>\
        </div>\
      </div>\
    </div>';
  }).join('\n');
  var cartTotals = '\
    <div class="cart-footer">\
      <div class="grid">\
        <div class="col-9"></div>\
        <div class="col-3">\
          <div class="cart-footer-row">\
            <div class="grid">\
              <div class="col-6">\
                <h5>Subtotal</h5>\
              </div>\
              <div class="col-6 text-right">\
                <p>$'+cart.subtotal+'</p>\
              </div>\
            </div>\
          </div>\
          <div class="cart-footer-row">\
            <div class="grid">\
              <div class="col-12">\
                <a class="btn btn--full checkout" href="'+cart.checkoutUrl+'">Checkout</a>\
              </div>\
            </div>\
          </div>\
        </div>\
      </div>\
    </div>';
  $('#cart').html(cartLineItems+cartTotals);
}

/* ============================================================
  Finds the Cart Line Item by Variant ID
============================================================= */
function findCartItemByVariantId(variantId) {
  return cart.lineItems.filter(function (item) {
    console.log(item.variant_id, variantId)
    return (item.variant_id === variantId);
  })[0];
}

/* ============================================================
  Determine action for variant adding/updating/removing
============================================================= */
function addOrUpdateVariant(variantID, quantity) {
  var variantIdNum = Number(variantID);
  var cartLineItem = findCartItemByVariantId(variantIdNum);
  if (cartLineItem) {
    updateVariantInCart(cartLineItem, quantity);
  } else {
    addVariantToCart(variant, quantity);
  }
}

/* ============================================================
  Update details for item already in cart. Remove if necessary
============================================================= */
function updateVariantInCart(cartLineItem, quantity) {
  var variantId = cartLineItem.variant_id;
  var cartLength = cart.lineItems.length;
  cart.updateLineItem(cartLineItem.id, quantity).then(function(updatedCart) {
    buildCart();
  }).catch(function (errors) {
    console.log('Fail');
    console.error(errors);
  });
}


/* ============================================================
  SHOPIFY STUFF
============================================================= */
$(function(){
  /* Toggle for the mobile nav */
  $('.mobile-nav').click(function(){
    $('.nav').toggleClass('nav-opened');
  });

  $('.phone-type-selector').change(function(){
    var phoneValue = $(this).val(),
        phoneType = $(this).find('option:selected').text();
    $.ajax({
      type: 'POST',
      data: {
        'attributes': {
          'phone_value': phoneValue,
          'phone_type': phoneType
        }
      },
      dataType: 'json',
      url: '/cart/update.js',
      success: function(cart) {
        location.reload();
      }
    });
  });

  /* Fire the "zooming" plugin. */
  const zooming = new Zooming({
    onOpen: function(el){
      console.log('test', el);
    }
  });
  zooming.listen('.featured-image');

  /* Make the tabs on the product page open/close */
  $('.tab-title').click(function(){
    var tabNumber = $(this).attr('data-tab');
    $('.tab-title.active, .tab-content.active').removeClass('active');
    $(this).addClass('active');
    $('.tab-content[data-tab="'+tabNumber+'"]').addClass('active');
  });

  /* =================================================
  AJAX ADD TO CART
  ================================================= */
  $('.cart-button').click(function(){
    miniCart();
  });

  $('.content-wrapper, #shopify-section-footer').on('click', function(){
    if($(this).hasClass('cart-opened')){
      miniCart();
    }
  });

  $('.product-form').submit(function(e){
    e.preventDefault();
    var variantId = $(this).find('.product-select').val(),
        quantity = $(this).find('.quantity').val();
    $.ajax({
      url: '/cart/add.js',
      dataType: 'json',
      async: true,
      type: 'POST',
      data:{
        id: variantId,
        quantity: quantity
      },
      success: function(cart){
        miniCart();
        updateMiniCart();
      },
      error: function(error){
        console.log(error);
      }
    });
  });

  $('.mini-cart').on('click', '.mini-cart-item-remove', function(){
    var variantId = Number($(this).attr('data-variant-id')),
        quantity = 0,
        lineNumber = Number($(this).attr('data-line-number'));
        console.log(variantId, quantity, lineNumber);
    removeItem(variantId, quantity, lineNumber);
  });

  function miniCart(){
    $('.cart-button, .mini-cart, .content-wrapper, #shopify-section-footer').toggleClass('cart-opened');
  }

  function updateMiniCart(){
    var miniCartBody = $('.mini-cart-body'),
        miniCartFooter = $('.mini-cart-footer');
    miniCartBody.prepend('<div class="mini-cart-refresh"><i class="icomoon-refresh icomoon--spin-clockwise"></i></div>');
    $.ajax({
      url: '/cart.js',
      dataType: 'json',
      async: true,
      type: 'GET',
      success: function(cart){
        if(cart.item_count > 0){
          miniCartBody.html('');
          $.each(cart.items, function(index, item){
            var newIndex = index + 1,
                itemImage = item.image,
                newItemImage = itemImage.replace('.png', '_100x.png');
            miniCartBody.append('\
            <div class="mini-cart-item-row">\
              <div class="grid-middle text-left">\
                <div class="col-2">\
                  <div class="mini-cart-item-image">\
                    <img src="'+newItemImage+'" alt="'+item.product_title+'">\
                  </div>\
                </div>\
                <div class="col-6">\
                  <h4 class="mini-cart-item-title"><a href="'+item.url+'">'+item.product_title+'</a></h4>\
                  <small class="cart-variant">'+item.variant_title+'</small>\
                </div>\
                <div class="col-3 text-right">\
                  <p class="mini-cart-item-price">'+Shopify.formatMoney(item.line_price)+'</p>\
                </div>\
                <div class="col-1">\
                  <span class="mini-cart-item-remove" data-variant-id="'+item.variant_id+'" data-quantity="'+item.quantity+'" data-line-number="'+newIndex+'"><i class="icomoon-close"></i></span>\
                </div>\
              </div>\
            </div>');
          });
          if(miniCartFooter.hasClass('is-empty')){
            miniCartFooter.html('\
            <div class="grid">\
              <div class="col-7 padding text-right">\
                <p class="mini-cart-footer-total">Total</p>\
              </div>\
              <div class="col-4 padding text-right" data-push-right="push-1">\
                <p class="mini-cart-footer-total-price">'+Shopify.formatMoney(cart.total_price)+'</p>\
              </div>\
              <div class="col-4 padding">\
                <a class="button--light--full mini-cart-button" href="/cart">Cart</a>\
              </div>\
              <div class="col-8 padding">\
                <button class="button--full checkout" name="checkout" type="submit">Checkout</button>\
              </div>\
            </div>');
          }
          else {
            $('.mini-cart-footer-total-price').html(Shopify.formatMoney(cart.total_price));
          }
        }
        else {
          $('.mini-cart-inner').html('\
          <div class="mini-cart-body">\
            <div class="mini-cart-item-row text-center">\
              <p>Your cart is empty</p>\
            </div>\
          </div>\
          <div class="mini-cart-footer is-empty">\
            <div class="grid">\
              <div class="col-12 padding">\
                <a class="button--full" href="/collections/all">Start Shopping</a>\
              </div>\
            </div>\
          </div>');
        }
      },
      error: function(error){
        console.log(error);
      }
    });
  }

  function removeItem(variantId, quantity, lineNumber){
    console.log(variantId, quantity, lineNumber);
    $.ajax({
      url: '/cart/change.js',
      dataType: 'json',
      async: true,
      type: 'POST',
      data: {
        line: lineNumber,
        quantity: quantity
      },
      success: function(){
        updateMiniCart();
      },
      error: function(error){
        console.log(error);
      }
    });
  }

  calcMiniCartHeight();

  $(window).on('resize', function(){
    calcMiniCartHeight();
  });

  function calcMiniCartHeight(){
    var headerOuterHeight = $('#shopify-section-header').outerHeight();
    $('.mini-cart-inner').css('max-height', (window.innerHeight - headerOuterHeight) + 'px');
  }

  Plugin.prototype._computeMiniCartHeight = function() {
    // First, we need to get how much of the "top bar" (which is not fixed) is visible in the viewport
    var announcementBarVisibleHeight = 0,
      headerOuterHeight = this.header.outerHeight();

    if (this.announcementBar.length > 0) {
      var announcementBarHeight = this.announcementBar.height(),
        windowHeight = $(window).height(),
        rect = this.announcementBar[0].getBoundingClientRect();

      announcementBarVisibleHeight = Math.max(0, rect.top > 0 ? Math.min(announcementBarHeight, windowHeight - rect.top) : (rect.bottom < windowHeight ? rect.bottom : windowHeight));
    }

    this.miniCart.find('.mini-cart__inner').css('max-height', (window.innerHeight - headerOuterHeight - announcementBarVisibleHeight) + 'px');
  };

  /* =================================================
  QUANTITY BOX
  ================================================= */
  $('.quantity-minus').click(function(){
    var theWrapper = $(this).closest('.quantity-wrapper'),
        theInput = theWrapper.find('input'),
        theInputVal = Number(theInput.val()),
        theUpdatedInput = theInputVal - 1;
    theInput.val(theUpdatedInput).change();
  });

  $('.quantity-plus').click(function(){
    var theWrapper = $(this).closest('.quantity-wrapper'),
        theInput = theWrapper.find('input'),
        theInputVal = Number(theInput.val()),
        theUpdatedInput = theInputVal + 1;
    theInput.val(theUpdatedInput).change();
  });

  $('.cart-quantity').change(function(){
    $('.cart-update').click();
  });
});
