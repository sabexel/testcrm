import Selectr from "mobius1-selectr";
import { Datepicker } from "vanillajs-datepicker";
// import DataTables from "datatables.net-dt";
import Fuse from 'fuse.js';
let fuse;

$(document).on('input', '.search-city', function(){
  var $this = $(this),
  id = $this.data('order-id');
  let results = fuse.search($(this).val());
  
  $('#results-' + id).empty(); // clear previous results
  
  results.forEach(result => {
    $('#results-' + id).append($('<div class="fuse-result-item" data-id="'+ result.item.id +'">').text(result.item.title));
  });
  $('#results-' + id).show();
})
$(document).on('blur', '.search-city', function(){
  $('.fuse-search-result').hide();
  $('.fuse-search-result').empty();
})

var filter_products = new Selectr("#filter-product");

var city_select = new Selectr("#filter-city", {
    multiple: !0,
    defaultSelected: false
});

var ajaxResponse = null,
show_reason_column = false,
editting_inline = false,
editButton = '',
hide_order_details = true,
status_tab = $('ul.status-links li a.active').data('status'),
cities_items = [];

if (Laravel.user && Laravel.user.permissions.includes('un_hide_order_details')) {
  hide_order_details = false;
}
if (Laravel.user && Laravel.user.permissions.includes('allow_inline_edit')) {
  editting_inline = true;
  editButton = '<button type="button" class="btn btn-de-primary btn-sm px-1 py-0 ms-1 small-icon-btn inline-edit-btn"><i data-feather="edit-2" class="small-icon"></i></button>';
}


if(status_tab == 'cancelled' || status_tab == 'on-hold'){
  show_reason_column = true;
}

// select the target node
var targetNode = document.body;

// create a new MutationObserver
var observer = new MutationObserver(function(mutations) {
  // iterate through the list of mutations
  mutations.forEach(function(mutation) {
    // check if the mutation type is "childList" (i.e. a child node has been added or removed)
    if (mutation.type === 'childList') {
      // execute feather.replace() to update icons
      feather.replace();
    }
  });    
});

// configure the observer to watch for changes to the entire subtree of the target node
var config = { childList: true, subtree: true };

// start observing the target node for changes
observer.observe(targetNode, config);

var order_table = $('#orders-main-table');

window.o_Table = $('#orders-main-table').DataTable({
    ajax: {
      url: order_table.data('url'),
      type: 'GET',
      data: {
          status: status_tab // set the default status value as a data parameter
      },
      dataSrc: function(json) { 
        ajaxResponse = json;
        return json.orders;
      }
    },
    columns: [
      { data: '', width: '0px' },
      { data: 'created_at', width: '80px' },
      { data: 'name', width: '130px' },
      { data: 'mobile', width: '110px' },
      { data: 'address' },
      { data: 'city', width: '170px' },
      { data: 'product', width: '90px' },
      { data: 'cod', width: '60px' },
      { data: 'status', width: '10px' },
      { data: '', width: '100px' },
      { data: '', width: '150px' }
    ],
    columnDefs: [
      {
          // For Checkboxes
          targets: 0,
          orderable: false,
          searchable: false,
          checkboxes: true,
          visible: false,
          render: function () {
            return '<input type="checkbox" class="dt-checkboxes form-check-input">';
          },
          // checkboxes: {
          //   selectAllRender: '<input type="checkbox" class="form-check-input">'
          // }
      },
      {
        targets: 1,
        render: function(data, type, full, meta){
          // Get the created_at value from Laravel and create a new Date object
          var createdAt = new Date(full['created_at']);

          // Get the current time
          var now = new Date();

          // Define the time intervals in seconds
          var intervals = {
              'year': 31536000,
              'month': 2592000,
              'week': 604800,
              'day': 86400,
              'hour': 3600,
              'minute': 60,
              'second': 1
          };

          // Calculate the time difference in milliseconds
          var diff = now.getTime() - createdAt.getTime();

          // Calculate the time difference in each interval
          var timeAgo = '';
          for (var interval in intervals) {
              var count = Math.floor(diff / (intervals[interval] * 1000));
              if (count > 0) {
                  if (interval === 'day' && count === 1) {
                      // Display the time difference in "X unit(s) ago" format if the time difference is one day ago
                      timeAgo = count + ' ' + interval + ' ago';
                  } else if (diff > intervals['day'] * 1000) {
                      // Display the date in "MMM DD, YYYY" format if the time difference is greater than one day ago
                      timeAgo = createdAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                  } else {
                      // Display the time difference in "X unit(s) ago" format for all other time intervals
                      timeAgo = count + ' ' + interval + (count > 1 ? 's' : '') + ' ago';
                  }
                  break;
              }
          }
          return (
            timeAgo
          );
        }

      },
      {
        targets: 2,
        orderable: false,
        render: function(data, type, full, meta){
          var customer = full['order_customer'] ? full['order_customer'] : full['customer'],
          template = name_display_template(customer, full, 'customer-name');

          return (template);
        }
      },
      {
        targets: 3,
        orderable: false,
        render: function(data, type, full, meta){
          var customer = full['order_customer'] ? full['order_customer'] : full['customer'],
          template = mobile_display_template(customer, full, 'mobile-no', hide_order_details);
          
          return (template);
        }
      },
      {
        targets: 4,
        orderable: false,
        render: function(data, type, full, meta){
          var address = full['address'] ? full['address'] : 'no address';
          if(address){
            return(address_display_template(address, full, 'address', hide_order_details)); 
          }else{
            return ('no address');
          }
                 
        }
      },
      {
        targets: 5,
        render: function(data, type, full, meta){
          var output = null,
          classes = ' ';
          if(editting_inline === true){
            classes += 'inline-edit ';   
          }

            if(full['city_id']){
              output = '<div class="city-name ' + classes + '" data-key="city_id" data-city-id="' + full['city_id'] + '">'+full['city']['name']+ editButton + '</div>';
            }else{
              // output = '<select class="form-select city-select" data-row-id="' + full['id'] + '"></select>';
              // output = '<div class="search-wrapper"><input type="text" name="city-search" data-row-id="' + full['id'] + '" class="city-search-box form-control"/><div class="search-results-container" style="display:none;"></div></div>';
              output = '<input type="text" id="search-' + full['id'] + '" class="search-city form-control" data-order-id="' + full['id'] + '" /><div id="results-' + full['id'] + '" class="fuse-search-result" style="display:none;"></div>';
            }

            return output;
        }
      },
      {
        targets: 6,
        render: function(data, type, full, meta) {
          var productsHtml = '',
          qty = full['products'].length,
          product = full['products'][0];
          
          // Create an array to hold the product names
          let productNames = [];
      
          if(product){
            productNames.push(product.id);
            productsHtml += product.name + ' <span class="product-quantity-display"><small class="text-small">x </small>' + product.qty + '</span>';
      
            if(qty >1){
              var remain = qty -1;
              productsHtml += '<div> (+) ' + remain + ' more</div>';  
            }
          }else{
            productsHtml = 'No products';
          }
          
          // Loop through the remaining products and add each product name to the array
          for (var i = 1; i < qty; i++) {
              productNames.push(full['products'][i].id);
              break;
          }
      
          // Convert the product names array to a comma-separated string
          let productNamesStr = productNames.join(',');
      
          // Wrap the productsHtml in a div with a data-products attribute
          productsHtml = '<div data-products="' + productNamesStr + '">' + productsHtml + '</div>';
      
          return productsHtml;
        }
      },      
      {
        targets: 7,
        orderable: false,
        render: function(data, type, full, meta){
          var total_amount = $(this).currency(full['total_price']);
          return total_amount;
        }
      },
      {
        // Label
        targets: -3,
        orderable: false,
        render: function (data, type, full, meta) {
          var $status = full['status'];
          // /orders/'+full['id']+' target="_blank"
          return (
            ' <a href="javascript:void();" type="button" class="btn btn-'+ $status.btn_classes +' btn-icon-square-sm show-pannel cursor-pointer" data-bs-toggle="tooltip" data-bs-placement="top" title="'+$status.title+'"><i class="text-white '+$status.icon+'"></i></a>'
          );
        }
      },
      {
        // Actions
        targets: -2,
        orderable: false,
        title: 'Actions',
        orderable: false,
        searchable: false,
        render: function (data, type, full, meta) {
          var $statuses = ajaxResponse.statuses,
          buttons = '',
          disabling = '';

          if(status_tab == 'new' && hide_order_details === true ){
            disabling = 'disabled';
          }
          
          for (var i = 0; i < $statuses.length; i++) {
            var status = $statuses[i],
            modal_box = '';
            if(status.id == 5){
              modal_box = 'data-bs-toggle="modal" data-bs-target="#onHoldModal"';
            }
            if(status.id == 4){
              modal_box = 'data-bs-toggle="modal" data-bs-target="#onCancelModal"';
            }

            buttons += '<button type="button" class="btn btn-outline-secondary action-btn" ' + modal_box + '  data-bs-toggle="tooltip" data-bs-placement="top" title="'+$statuses[i].title+'" data-status="'+ $statuses[i].id +'" data-row-id="'+full.id+'" '+disabling+'><i class="text-primary '+ $statuses[i].icon +'" ></i></button>';
          }
          return (
            `<div class="btn-group">` + buttons + `</div>`
          );
        }
      },
      {
        targets: -1,
        orderable: false,
        visible: show_reason_column,
        render: function(data, type, full, meta){
          if(full['order_cancel']){
            var cannedMessage = full['order_cancel'],
            template = cannedMessage.canned_message.message;

            if(cannedMessage.reason != null){
              template += '<div>Reason: '+ cannedMessage.reason +'</div>';
            }
            template += '<div class="strong text-muted">' + cannedMessage.user_details.name + '</div>';
            // console.log(full['order_cancel']);
            return template;
          }else{
            return '';
          } 
        }
      }
    ],
    initComplete: function() {

      // Get the cities data from the Ajax response
      var cities = ajaxResponse.cities,
      cities_items = ajaxResponse.cities_items;

      var items = cities_items;
      // let items = [
      //   { title: "Apple", id:2 },
      //   { title: "Banana", id:4 },
      //   { title: "Cherry", id:5 },
      //   { title: "Date", id:6 },
      //   { title: "Elderberry", id:7 },
      //   { title: "Fig", id:8 },
      //   { title: "Grape", id:9 }
      // ];
      
      let options = {
        includeScore: true,
        threshold: 0.3,
        keys: ["title"]
      };
      
      let fuse = new Fuse(items, options);

      // Loop through each select element and populate its options
      $('.city-select').each(function() {
          var $this = $(this);
          var options = '<option>Select City</option>'; // Add an empty option as the default option
          for (var i = 0; i < cities.length; i++) {
              var city = cities[i];
              options += '<option value="' + city.id + '">' + city.name + '</option>';
          }
          $this.html(options); // Set the options for the select element
          $this.val(function() {
              return $this.data('selected-city');
          }); // Set the selected value for the select element

          // Initialize the Selectr instance
          new Selectr($this.get(0));
      });
    },
    "dom":  '<"row"<"col-12"tr>>' +
            '<"row pb-2 px-2 mt-3"<"col-md-5"<"d-flex align-items-center"li>><"col-md-7"p>>',

    displayLength: 50,
    lengthMenu: [10, 25, 50, 75, 100],
    createdRow: function(row, data, dataIndex) {
      $(row).attr('data-row-id', data.id);
      $(row).attr('id', data.id);
    }
});
// "dom": 'rtilp',


$(document).on('keyup', '#order-search-field', function(){
    o_Table.search($(this).val()).draw() ;
});

$(document).on('click', '.show-mobile-numbers', function(){
  var $this = $(this),
  id = $this.data('row-id'),
  row = o_Table.row('#' + id),
  access_token = $("input[name=auth_key]").val();

  $('table').block({ message: null });

  check_in_use(id)
  .then((data) => {
    //do success
    $.ajax({
      url: '/api/orders/'+id,
      type: 'GET',
      dataType: 'json',
      headers: {
          'Authorization': 'Bearer ' + access_token
      },
      success: function(order) {
        // console.log(order);
        $('table').unblock();
        var customer = order['order_customer'] ? order['order_customer'] : order['customer'],
        classes = 'address ';
        if(editting_inline === true){
          classes += ' inline-edit '
        }
        var address = '<div class="' + classes + '" data-key="address">' + order['address'].address + editButton + '</div>' + 
                        '<div class="address">' + order['address'].city + '</div>',
        phone =  mobile_display_template(customer, row, 'mobile-no', false);

        $this.closest('tr').find('td:eq(3)').html(address);
        $this.closest('tr').find('td:eq(2)').html(phone);
        $('tr#' + id + ' button').removeAttr('disabled');
      },
      error: function(xhr) {
          console.log(xhr.responseText);
      }
    });
  })
  .catch((error) => {
    console.log(error);
    alert(error.responseJSON);
  })
})

$(document).on('blur', '.city-select', function(){
  var $this = $(this),
  rowId = $this.closest('tr').attr('id'),
  cityId = $this.val();
  
  //call promise function to update city in order table
  update_order_value(rowId, null, 'city_id', cityId)
  .then((response) => {
    o_Table.row('#' + rowId).data(response.data).draw(false);
    $('#' + rowId + ' .show-mobile-numbers').trigger('click');
  })
  .catch((error) => {
    console.log(error);
    console.log(error.responseJSON);
    alert('Error updating data.');
  })

})

$(document).on('change', '.city-select', function(){
  var $this = $(this),
  rowId = $this.closest('tr').attr('id'),
  cityId = $this.val();
  
  //call promise function to update city in order table
  update_order_value(rowId, null, 'city_id', cityId)
  .then((response) => {
    o_Table.row('#' + rowId).data(response.data).draw(false);
    $('#' + rowId + ' .show-mobile-numbers').trigger('click');
  })
  .catch((error) => {
    console.log(error);
    console.log(error.responseJSON);
    alert('Error updating data.');
  })

})

$(document).on('click', '.action-btn', function(){
  var $this = $(this),
  order_id  = $this.data('row-id'),
  status_id = $this.data('status'),
  city_html = $this.closest('tr').find('td:eq(4)').html(),
  btn_html  = $this.html();

  if(status_id == 5 || status_id == 4){
    var btnModal = $this.data('bs-target'),
    openedModal = $(document).find(btnModal);
    openedModal.find('form').attr('data-order-id', order_id);
    return false;
  }

  if ($(city_html).hasClass('selectr-container')) {
    // Do something if the city HTML has the class 'some-class'
    window.toastr.warning('First select the city from drop down.', 'Select City!');
    return  false;
  } else {
    $this.html('<i class="la la-spinner text-primary orders-index-spinner la-spin progress-icon-spin"></i>');
    $(this).updateStatus(order_id, status_id)
    .then((response) => {
      var row = $('tr#' + order_id);
      row.addClass('bg-success fade-out');
      row.slideUp(1000, function(){
        o_Table.row(row).remove().draw();
      });
      $(this).updateStatusCounts();
      window.toastr.success('Order has been updated!', 'Order Updated');
    })
    .catch((error) => {
      // Handle the error here
      console.error(error);
      $this.html(btn_html);
      window.toastr.error(error.responseJSON.message, 'Order Update Failed');
    });
  }
})

$(document).on('click', '.inline-edit', function(){
    var $this = $(this),
    key = $this.data('key'),
    value = $this.text(),
    parent = $this.closest('td'),
    html = parent.html(),
    order_id = $this.closest('tr').data('row-id'),
    placeholder = '';
    switch (key) {
      case 'alternate_mobile':
        placeholder = 'Alternate Mobile';
        break;
    
      default:
        placeholder = key
        break;
    }
    var editTemplate = `<input type="text" name="` + key + `" class="form-control me-2 inline-edit-field" placeholder="` + placeholder + `" aria-label="` + key + `" aria-describedby="basic-addon1" value="` + value + `" autofocus required />`;

    $('.edit-inline-wrapper').remove();


    $(parent).attr('data-original-value', html);

    if(key == 'address'){
      editTemplate = `<textarea class="form-control me-2 inline-edit-field" name="`+key+`" rows="7" cols="10" style="width:300px;" required autofocus>`+value+`</textarea>`;
    }

    if (key == 'city_id') {
      
      var options = '<option value="">Select a city</option>',
      city_id = $this.data('city-id'),
      selected = null;
      ajaxResponse.cities.forEach(function(city) {
        if(city.id == city_id){
          selected = 'selected';
        }else{
          selected = null;
        }
        options += '<option value="' + city.id + '" ' + selected + '>' + city.name + '</option>';
      });
      editTemplate = '<select name="' + key + '" class="form-select city-select" id="city-edit-list">' + options + '</select>';
      parent.html(editTemplate);
      return;
    }
    
    var template = `<div class="edit-inline-wrapper">
      <form action="#" class="inline-edit-form" method="post" onsubmit="return false;">
        <div class="input-group btn-group-sm">
            
            `+editTemplate+`
            <button type="submit" class="btn btn-outline-success btn-icon-square-sm ms-1"><i data-feather="check"></i></button>
            <button type="reset" class="btn btn-outline-danger btn-icon-square-sm"><i data-feather="x"></i></button>
        </div>
        <input type="hidden" value="` + key + `" name="edit-order"/>
      </form>  
    </div>`;
    parent.append(template);
});

$(document).on('submit', '.inline-edit-form', function (e) {
  e.preventDefault();
  var $this = $(this),
  rowId = $this.closest('tr').data('row-id'),
  parent = $this.closest('td'),
  formData = $this.serialize(),
  row = o_Table.row(rowId);

  update_order_value(rowId, formData)
    .then((response) => {
      o_Table.row('#' + rowId).data(response.data).draw(false);
      if(hide_order_details === true){
        $('#' + rowId + ' .show-mobile-numbers').trigger('click');
      }

      $('.city-select').each(function() {
        var $this = $(this);
        var options = '<option>Select City</option>'; // Add an empty option as the default option
        for (var i = 0; i < ajaxResponse.cities.length; i++) {
          var city = ajaxResponse.cities[i];
          options += '<option value="' + city.id + '">' + city.name + '</option>';
        }
        $this.html(options); // Set the options for the select element
        $this.val(function() {
          return $this.data('selected-city');
        }); // Set the selected value for the select element

        new Selectr(this);
      });
    })
    .catch((error) => {
      console.log(error);
      // console.log(error.responseJSON);
      alert('Error updating data.');

    })
});

$(document).on('reset', '.inline-edit-form', function (e) {
  e.preventDefault();
  var $this = $(this),
  rowId = $this.closest('tr').data('row-id'),
  parent = $this.closest('td');
  $(parent).html(parent.data('original-value'));
});

$(document).on('keyup', 'input.city-search-box', function() {
  var $this = $(this), 
  query = $(this).val(),
  resultsBox = $this.closest('.search-wrapper').find('.search-results-container');
  if (query.length < 3) {
    // clear search results
  } else {
    $.ajax({
      url: 'cities/search-for-orders',
      method: 'GET',
      data: { query: query },
      success: function(data) {
        resultsBox.html(data);
        resultsBox.show();
      },
      error: function(xhr, textStatus, errorThrown) {
        console.error(errorThrown);
      }
    });
  }
});

$(document).on('keydown', 'input.inline-edit-field, textarea.inline-edit-field', function(e) {
  var $this = $(this),
  rowId = $this.closest('tr').data('row-id'),
  parent = $this.closest('td');

  if (e.key === 'Escape') { // Escape key pressed
    $(parent).html(parent.data('original-value'));
    
  }else if (e.key === 'Enter'){// Submit form Enter Key
    e.preventDefault();
    var form = $this.closest('form');
    form.trigger('submit');
  }
});

$(document).on('submit', '#cancel-order-form, #hold-order-form', function(e){
  e.preventDefault();
  var $this = $(this),
  orderId = $this.data('order-id'),
  statusId = $this.data('status-id'),
  formData = $this.serialize(),
  row = o_Table.row(orderId);
  
  $this.closest('.modal').removeClass('show');
  $this.closest('.modal').removeClass('fade');
  $this.closest('.modal').removeAttr('style');
  $('.modal-backdrop').remove();
  $(this).updateStatus(orderId, statusId)
  .then((response) => {
    var row = $('tr#' + order_id);
    o_Table.row(row).remove().draw();
    $(this).updateStatusCounts();
    window.toastr.success('Order has been updated!', 'Order Updated');
  });

  $(this).updateCannedMessage(orderId, formData);
  return false;
})

// Apply the city filter
city_select.on('selectr.change', function() {
  let cities = this.getValue();  // Get an array of selected cities
  // Reset the DataTable search
  window.o_Table.search('');

  // Create a custom filter function
  $.fn.dataTable.ext.search.push(
    function(settings, data, dataIndex) {
      // Assuming the city is the 6th column in the data
      let city = data[5];
      return cities.includes(city);
    }
  );
  
  // Redraw the table
  window.o_Table.draw();

  // Remove the custom filter function after drawing the table
  // to prevent it from affecting other tables or subsequent draws
  $.fn.dataTable.ext.search.pop();
});

filter_products.on('selectr.change', function() {
  let product = this.getValue();  // Get the selected product id
  
  // Reset the DataTable search
  window.o_Table.search('');
  
  // Create a custom filter function
  $.fn.dataTable.ext.search.push(
    function(settings, data, dataIndex) {
      // Get the row jQuery object
      let row = window.o_Table.row(dataIndex).node();
      
      // Get the products from the data-products attribute
      let rowProducts = $(row).find('[data-products]').attr('data-products').split(',').map(function(item) { return item.trim(); });
      
      // Check if the selected product id is in the row's products
      return rowProducts.includes(product);
    }
  );
  
  // Redraw the table
  window.o_Table.draw();
  
  // Remove the custom filter function after drawing the table
  // to prevent it from affecting other tables or subsequent draws
  $.fn.dataTable.ext.search.pop();
});

$('#reset-filters').on('click', function() {
  resetFilters();
});

function resetFilters() {
  // Reset selectr values
  city_select.clear();
  filter_products.clear();

  // Clear the DataTable search
  window.o_Table.search('').draw();
}



function check_in_use(order_id) {
  return new Promise((resolve, reject) => {
    $.ajax({
      url: '/orders/check-in-use/' + order_id,
      type: 'GET',
      data: {order_id},
      success: function (data) {
        resolve(data)
      },
      error: function (error) {
        reject(error)
      },
    })
  })
}

function update_order_value(order_id, formData = null, column = null, value = null) {
  return new Promise((resolve, reject) => {
    if(column){
      formData = {column, value}
    }

    $.ajax({
      url: '/orders/' + order_id,
      type: 'PUT',
      data: formData,
      success: function (data) {
        resolve(data)
      },
      error: function (error) {
        reject(error)
      },
    })
  }) 
}

function address_display_template(address, row, classes = null, hide_details = true) {
  var template = null;

  if(status_tab == 'new' && hide_details === true){
    template = `<div class="address">***********************</div>
    <div class="address">City: ******</div>`;
  }else{
    if(editting_inline === true){
      classes += ' inline-edit '
    }
    template = `<div class="` + classes + `" data-key="address">` + address['address'] + editButton + `</div>`;
    template += `<div class="address">City: ` + address['city'] + `</div>`;
  }

  return template;
}

function name_display_template(customer, row, classes = null) {
  var template = null;

  if(editting_inline === true){
    classes += ' inline-edit ';
  }
  var template = '<span class="' + classes + '" data-key="name">' + customer.name + editButton + '</span>';

  template += '<div class="d-flex">';

  if(row['issue'] == 1){
    template += '<a class="order-issue me-1 custom-tooltip" data-bs-toggle="tooltip" data-bs-placement="top" data-bs-custom-class="custom-tooltip" data-bs-title="This top tooltip is themed via CSS variables." href="/orders/multiple-orders/' + row['id'] + '" target="_blank"><i class="feather-13" data-feather="eye"></i></a>';
  }
  if(row['have_orders'] == 1){
    template += '<a class="order-issue me-1" data-bs-toggle="tooltip" data-bs-placement="top" title="multiple orders" href="/orders/multiple-orders/' + row['id'] + '" target="_blank"><i class="feather-13" data-feather="layers"></i></a>';
  }

  template += '</div>';

  return template;
}

function mobile_display_template(customer, row, classes = null, hide_details = true) {
  var template = null,
  zoomBtn = '<button type="button" class="btn btn-de-primary btn-sm px-1 py-0 ms-1 small-icon-btn" data-bs-toggle="modal" data-bs-target="#detail-zoom-modal"><i data-feather="zoom-in" class="small-icon"></i></button>';
  
  if(hide_details === true && status_tab == 'new'){
    template = `
    <div class="d-flex align-items-center">
      <div class="phone numbse">
        <div class="primary-mobile">03xx-xxxxxxx</div>`;
        if(customer.alternate_mobile){
          template += '<div class="alternate-mobile">03xx-xxxxxxx</div>';
        }  
    
    template +=  `
      </div>
      <div class="ms-auto">
        <a href="javascript:void(0)" class="show-mobile-numbers" data-row-id="`+row.id+`"><i class="ti ti-eye"></i></a>
      </div>
    </div>`;
  }else{

    template = '<div class="' + classes + '">0' + customer.mobile + '</div>';
    if(editting_inline === true){
      classes += ' inline-edit ';
    }
    if(customer.alternate_mobile){
      
      template += '<div class="'+classes+'" data-key="alternate_mobile">0' + customer.alternate_mobile + editButton + '</div>';
    }else{
      template += '<span class="add-alternate-mobile-btn ' + classes + '" data-key="alternate_mobile"><i data-feather="plus" class="feather-13"></i></span>'
    }

    template += `
    <div class="modal fade" id="detail-zoom-modal" tabindex="-1" role="dialog" aria-labelledby="detail-zoom-modalTitle" aria-hidden="true">
      <div class="modal-dialog modal-dialog-centered" role="document">
        <div class="modal-content">
          <div class="modal-header">
            <h6 class="modal-title m-0" id="detail-zoom-modalTitle">Order Details</h6>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div><!--end modal-header-->
          <div class="modal-body">
            <div class="row">
              <div class="col-lg-3 text-center align-self-center">
                <img src="assets/images/small/btc.png" alt="" class="img-fluid">
              </div><!--end col-->
              <div class="col-lg-9">
                <h5>Name: `+customer.name+`</h5>
                <h5>Mobile: 0`+customer.mobile+`</h5>
                <h5>Alternate Mobile: 0`+customer.alternate_mobile+`</h5>
              </div><!--end col-->
            </div><!--end row-->   
          </div><!--end modal-body-->
        </div><!--end modal-content-->
      </div><!--end modal-dialog-->
    </div><!--end modal-->
    `;
  }

  return template;
}

$.fn.updateStatusCounts = function () {
  var store = $('.store-btn.active .store-name').text()
  $('span.status-counter').html('<i class="la la-spinner text-primary la-spin progress-icon-spin"></i>');
  // Make an AJAX request to the server
  $.ajax({
      url: '/update-status-counts?store=' + store,
      method: 'POST',
      dataType: 'json',
      success: function(response) {
      var data = response['counts'],
      stores = response['store_counts'];
      // Loop through each status link and update the count
          $('#status-links li').each(function() {
              var status = $(this).find('a').data('status');
              var count = data[status];
              $(this).find('span').text('(' + count + ')');
          });

          $('.card-body.stores-list-container a').each(function(){
          var store = $(this).data('store'),
          count = stores[store];
          $(this).find('span.badge').text(count);
          })
      },
      error: function(xhr, textStatus, errorThrown) {
          console.log('Error updating status counts:', errorThrown);
      }
  });
}