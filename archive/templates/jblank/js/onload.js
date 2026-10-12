jQuery(document).ready(function(){

function checkAgreement(){
       var agree = jQuery(this).find('input[name=f_Agreement]').is(':checked');
       if(agree == false){
           jQuery(this).find('label.agreement_label').fadeOut(400, function(){ jQuery(this).fadeIn(); } )
           return false;
           
       }
   }
   jQuery('form.fz152').submit( checkAgreement );
   jQuery('a.modal-call').click( function(){
       var modalId = jQuery(this).attr('data-target');
       jQuery(modalId).find('form.fz152').submit( checkAgreement );
   } );

   jQuery('div.menu-catalog').corner("round 8px");
   jQuery('input.submit').corner("round 8px");
   jQuery('button.submit').corner("round 8px");
   jQuery('.border-news').corner("round 15px");
 /* jQuery('div.menu-catalog').corner("round 8px");
   jQuery('input.submit').corner("round 8px");
   jQuery('button.submit').corner("round 8px");
   jQuery('.border-news').corner("round 15px");
   if(jQuery('#slideshow img:first').hasClass('active') == false) {
      jQuery('#slideshow img:first').addClass('active');
   }
    jQuery("ul.menu li").hover(
    function () {
    if(jQuery(this).hasClass('item-112')){
      var menuCatHTML = jQuery('.menu-catalog').html();
      jQuery(this).append(menuCatHTML);
      jQuery('ul.menu li.item-112 .VMmenu').show();
    }
    else jQuery(this).find('ul').show();

    },
    function () {
    if(jQuery(this).attr('class') == 'item-112'){
      jQuery('ul.menu li.item-112 .VMmenu').empty().remove();
    }
    jQuery(this).find('ul').hide();
    } 
    );  */
});         



/* $("input.value_login").click(function () {
    if ($("input.value_login").val() == 'Ëîãèí' ){
	    $("input.value_login").val ( '' );
	  }
  });  
  $("input.value_password").click(function () {
    if ($("input.value_password").val() == 'Ïàðîëü' ){
	    $("input.value_password").val ( '' );
	  }
  });  */