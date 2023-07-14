<?php

namespace App\Http\Controllers;

use App\Events\NewNotification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Schema;

use App\Models\Customer;
use App\Models\Order;
use App\Models\OrderStatus;
use App\Models\OrderAddress;
use App\Models\Store;
use App\Models\City;
use App\Models\Product;
use App\Models\PaymentMode;



use App\Events\Orders\StatusUpdated;
use App\Exports\OrdersExport;
use App\Models\Complaint;
use App\Models\OrderCustomer;
use App\Models\OrderTimeline;
use App\Models\OrderCannedMessage;
use App\Models\OrderCancel;
use App\Models\OrderDiscount;
use App\Models\OrderDiscountType;
use App\Models\OrderPayment;
use App\Models\OrderProduct;
use App\Models\User;
use App\Models\UserMeta;
use App\Notifications\ComplaintCreated;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Maatwebsite\Excel\Facades\Excel;

class OrderController extends Controller
{
    /**
     * Display a listing of the resource.
     *
     * @return \Illuminate\Http\Response
     */
    public function index(Request $request)
    {
        $store_in_url   = $request->store;

        if(!(Store::where('name', $store_in_url)->exists()) || Store::where('name', $store_in_url)->first()->active == 0){
            return redirect('/')->with('error', 'No store found with name ' . $store_in_url . '. Contact with your manager to get store access.' );
        }
        
        $request->status ? $status = $request->status : $status = 'new';

        $statuses   = $this->status_counts($request);
        $stores     = $this->stores();
        $canned_messages = OrderCannedMessage::all();
        $products   = Product::where('active', 1)->get();
        $cities     = City::all();
        
        return view('orders.index', compact('statuses', 'status', 'stores', 'store_in_url', 'canned_messages', 'products', 'cities'));
    }

    /**
     * Show the form for creating a new resource.
     *
     * @return \Illuminate\Http\Response
     */
    public function create()
    {
        if(request()->ajax()){
            $cities = City::all();
            $products = Product::all();
            $discount_types = OrderDiscountType::all();
            $template = view('orders.new_order.panel', compact( 'cities', 'products', 'discount_types'))->render();
            return response()->json(['template' => $template], 200);
        }
        
    }

    /**
     * Store a newly created resource in storage.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return \Illuminate\Http\Response
     */
    public function store(Request $request)
    {
        $customer = Customer::where(function ($query) use ($request) {
            $query->where('mobile', $request->input('mobile'))
                ->orWhere('alternate_mobile', $request->input('mobile'))
                ->orWhere('mobile', $request->input('alternate-mobile'))
                ->orWhere('alternate_mobile', $request->input('alternate-mobile'));
        })
        ->whereNotNull('mobile')
        ->whereNotNull('alternate_mobile')
        ->first();        

        $issue = 0;

        if($customer && $customer->name != $request->input('name')){
            $issue = 1;
        }else{
            $customer = Customer::create([
                'name'              => $request->input('name'),
                'mobile'            => $request->input('mobile'),
                'alternate_mobile'  => $request->input('alternate-mobile'),
                'email'             => $request->input('email')
            ]);
        }

        //create order
        $order = Order::create([
            'order_no'      => '99' . str_pad(rand(0, pow(10, 10)-1), 10, '0', STR_PAD_LEFT),
            'site_id'       => 17,
            'customer_id'   => $customer->id,
            'cod'           => 0,
            'shipping_price'=> $request->input('shipping-price'),
            'issue'         => $issue,
            'remarks'       => $request->input('remarks'),
            'created_by'    => auth()->user()->id
        ]);

        //save product against order_id
        foreach ($request->input('outer-list') as $item) {
            $product = Product::find($item['product-name']);
            OrderProduct::create([
                'name'          => $product->name,
                'qty'           => $item['quantity'],
                'price'         => $product->price,
                'sku'           => $product->sku,
                'product_id'    => $product->id,
                'order_id'      => $order->id
            ]); 
        }

        //save address against order_id
        $city = City::find($request->input('city-select'));
        OrderAddress::create([
            'address'   => $request->input('address'),
            'city'      => $city->name,
            'order_id'  => $order->id
        ]);

        if($request->input('discount-value')){
            OrderDiscount::create([
                'type_id'   => $request->input('discount-type'),
                'value'     => $request->input('discount-value'),
                'order_id'  => $order->id,
                'user_id'   => auth()->user()->id
            ]);
        }
        

        //update order cod price after product entry
        $this->update_cod($order->id);

        return response()->json($this->get_upated_order($order->id), 200);
    }

    /**
     * Display the specified resource.
     *
     * @param  int  $id
     * @return \Illuminate\Http\Response
     */
    public function show($id)
    {
        $order = Order::find($id);
        $timeline = OrderTimeline::where('order_id', $id)->get();
        return view('orders.show', compact('order', 'timeline'));
    }

    /**
     * Show the form for editing the specified resource.
     *
     * @param  int  $id
     * @return \Illuminate\Http\Response
     */
    public function edit($id)
    {
        //
    }

    /**
     * Update the specified resource in storage.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  int  $id
     * @return \Illuminate\Http\Response
     */
    public function update(Request $request, $id)
    {
        $order  = Order::find($id);
        $user   = Auth::user();

        if($status = $request->status){ //Update Status of order
            $order->status_id = $request->status;
            $order_details = $this->get_upated_order($order->id);
            if($order_details->products->isEmpty()){
                return response()->json(['message' => 'Please add products to order'], 403);

            }
            if($order->belongs_to == ''){
                $order->belongs_to = $user->id;
            }
            if($order->courier_id == null && $status == 3){
                $city = City::find($order->city_id);
                $order->courier_id = $city->courier_id;
            }
            $order->save();

            event(new StatusUpdated($order));
            return response()->json($this->get_upated_order($order->id), 200);

        }elseif($field = $request->input('edit-order')){ //Update inline edit any column
            $value = $request->$field;
            $order_columns = Schema::getColumnListing('orders');
            $customer_columns= Schema::getColumnListing('customers');
            $address_columns= Schema::getColumnListing('order_addresses');
            
            //here we check in which order table the field exists so we will update it accordingly
            if(in_array($field, $order_columns)){
                $order->$field = $value;
                $order->save();
            }elseif (in_array($field, $customer_columns )) {
                $customer = Customer::find($order->customer_id);
                $customer->$field = $value;
                $customer->save();
                //updating in another table too...
                $cust = OrderCustomer::where('order_id', $order->id)->first();
                if($cust){
                    $cust->$field = $value;
                    $cust->save();
                }
                
            }elseif (in_array($field, $address_columns)) {
                $address = OrderAddress::where('order_id', $order->id)->first();
                $address->$field = $value;
                $address->save();
            }

            //returning new updated order with all relations so that fresh data could be populated.
            return response()->json(['data' => $this->get_upated_order($order->id)], 200);

        }elseif ($field = $request->input('column')) { //update any column of order table
            $order->$field = $request->value;
            $order->save();

            //returning new updated order with all relations so that fresh data could be populated.
            return response()->json(['data' => $this->get_upated_order($order->id)], 200);
        }elseif ($canned_message = $request->input('canned-message')) {
            $order_cancel = new OrderCancel;
            $order_cancel->order_id     = $order->id;
            $order_cancel->canned_id    = $request->input('hold-message');
            $order_cancel->reason       = $request->input('custom-message');
            $order_cancel->user_id      = $user->id;
            $order_cancel->save();

            return response()->json($order_cancel->id, 200);
        }elseif ($discount_type = $request->input('discount-add')) {
            $discount = new OrderDiscount;
            $discount->type_id  = $discount_type;
            $discount->value    = $request->input('discount-value');
            $discount->order_id = $order->id;
            $discount->user_id  = $user->id;
            $discount->save();

            $discount_types = OrderDiscountType::all();
            $order_discounts= OrderDiscount::where('order_id', $order->id)->get();
            $template = view('orders.index.panel.discounts', compact('order', 'discount_types', 'order_discounts'))->render();
            
            //update price change
            $this->update_cod($order->id);

            return response()->json(['template' => $template], 200);
        }elseif($request->panel_edit){

            $order->city_id = $request->input('city-select');
            $order->remarks = $request->remarks;
            $order->save();

            $address = OrderAddress::where('order_id', $order->id)->latest()->first();
            $address->address   = $request->input('panel-address');
            $address->city      = $request->input('panel-city');
            $address->city_id   = $request->input('city-select');
            $address->save();

            if($order->issue == 1){
                $customer = OrderCustomer::where('order_id', $order->id)->where('customer_id', $order->customer_id)->latest()->first();
            }else{
                $customer = Customer::find($order->customer_id);
            }
            $customer->alternate_mobile = $request->input('panel-alternate-mobile');
            $customer->email            = $request->input('panel-email');
            $customer->name             = $request->input('panel-name');
            $customer->save();
            
            $output = [
                'order' => $this->get_upated_order($order->id)
            ];
            return response()->json($output, 200);
        }

        return response()->json('not updated any thing', '405');
    }

    /**
     * Remove the specified resource from storage.
     *
     * @param  int  $id
     * @return \Illuminate\Http\Response
     */
    public function destroy($id)
    {
        //
    }

    public function get_list(Request $request)
    {
        $status = $request->status;
        $site   = $request->store;
        $user_id = Auth::user()->id;

        $store  = Store::where('name', $site)->first();
        $cities = City::all();
        $usermeta = UserMeta::where('user_id', Auth::user()->id)->where('user_key', 'store_allowed')->where('user_value', $store->name)->first();
        if (empty($usermeta)) {
            // return response()->json(['error' => 'Store not found.'], 404);
            $store->id = 0;
        }        

        $orders = Order::with([
            'status:id,name AS status,icon,btn_classes,title',
            'address',
            'products',
            'customer',
            'city',
            'order_customer',
            'order_cancel' => function ($query) {
                $query->with(['canned_message' => function($query){
                    $query->select('id', 'message', 'status_id');
                }, 'user_details'])->latest();
            }
        ])
        ->where('site_id', $store->id)
        ->when($status, function ($query, $status) {
            return $query->whereHas('orderStatus', function ($query) use ($status) {
                $query->where('name', $status);
            });
        })
        ->when($status != 'new', function ($query) use ($user_id) {
            return $query->where('belongs_to', $user_id);
        })
        ->orderBy('created_at', 'DESC')
        ->get()
        ->map(function ($order) {
            $totalProductPrice = $order->products->sum(function ($product) {
                return $product->price * $product->qty;
            });

            $totalOrderPrice = $totalProductPrice + $order->shipping_price;
            $order->total_price = $totalOrderPrice;
            return $order;
        });
        if($status == 'completed'){
            $statuses = OrderStatus::where('name', 'cancelled')->get();
        }else{
            $statuses = OrderStatus::where('on_orders', 1)
            ->where('id', '!=', 1)
            ->where('on_orders', 1)
            ->when($request->has('status'), function($query) use ($request){
                return $query->where('name', '!=', $request->status);
            })
            ->select('id', 'name', 'icon', 'btn_classes', 'title')
            ->orderBy('order', 'ASC')
            ->get();
        }
        
        if($request->ajax()){
            return response()->json(['orders' => $orders, 'cities' => $cities, 'statuses' => $statuses]);
        }else{
            return $orders;
        }
    }

    public function check_in_use($id)       
    {
        $order = Order::find($id);

        if($order->in_use == 0){
            return response()->json($id, 200);

        }else{
            return response()->json('Order is use by another agent', 405);
        }
        
    }

    public function get_upated_order($order_id)
    {
        $order = Order::with('status:id,name AS status,icon,btn_classes,title', 'address', 'products', 'customer', 'city', 'order_customer', 'discounts')->find($order_id);
        if ($order) {
            $total_product_price = $order->products->sum(function ($product) {
                return $product->price * $product->qty;
            });
            $total_discounts = $order->discounts->sum('amount');
            $order->total_price = $total_product_price + $order->shipping_price - $total_discounts;
        }

        return $order;
    }

    public function status_counts(Request $request)
    {
        $store      = Store::where('name', $request->store)->first();
        $statuses   = OrderStatus::orderBy('order', 'ASC')->where('on_orders', 1)
        ->withCount(['orders' => function ($query) use ($store) {
            $query->where('site_id', $store->id)
            ->where('belongs_to', auth()->user()->id);        
        }])->get();

        $new_orders   = OrderStatus::orderBy('order', 'ASC')->where('on_orders', 1)->where('id', 1)
        ->withCount(['orders' => function ($query) use ($store) {
            $query->where('site_id', $store->id);
        }])->first()->orders_count;

        $stores     = $this->stores();
                        
        if($request->ajax()){
            $counts = [];
            $store_counts = [];
            foreach ($statuses as $status) {
                $counts[$status->name] = $status->orders_count;
            }
            $counts['new'] = $new_orders;

            foreach ($stores as $store) {
                $store_counts[$store->id] = $store->orders_count;
            }

            return response()->json(['counts' => $counts, 'store_counts' => $store_counts]);
        }else{
            $result = collect(['statuses' => $statuses, 'new_orders' => $new_orders]);
            return $result;
            // return $statuses;
        }
    }

    public function stores()
    {
        // return Store::where('active', 1)->withCount('orders')->get();
        return Store::where('active', 1)
        ->join('user_metas as usermeta', 'stores.name', '=', 'usermeta.user_value')
        ->where('usermeta.user_key', 'store_allowed')
        ->where('usermeta.user_id', auth()->user()->id)
        ->withCount('orders')
        ->get();

    }

    public function details_pannel($id)
    {
        $order          = $this->get_upated_order($id);
        $products       = Product::all();
        $payment_modes  = PaymentMode::all();
        $discount_types = OrderDiscountType::all();
        $order_discounts= OrderDiscount::where('order_id', $order->id)->with('type_details')->get();
        $order_payments = OrderPayment::where('order_id', $order->id)->get();
        $totals         = $this->get_totals($id);
        $statuses       = OrderStatus::where('on_orders', 1)->where('name', '!=', 'new')->orderBy('order')->get();
        $timeline       = OrderTimeline::where('order_id', $order->id)->get();
        $complaints     = Complaint::where('order_id', $order->id)->get();
        
        // event(new NewNotification('Hello World'));
        
        return view(
            'orders.pannel', 
            compact(
                'order', 
                'products',
                'payment_modes',
                'discount_types',
                'order_discounts',
                'order_payments',
                'totals',
                'statuses',
                'timeline',
                'complaints'
            )
        );
    }

    public function get_totals($id)
    {
        $order  = $this->get_upated_order($id);
        $discount = $order->discounts->sum('value');
        $total_product_price = $order->products->sum(function ($product) use ($order) {
            return ($product->price * $product->qty);
        });
        
        $total_qty = $order->products->sum('qty');
        $total_cod = $total_product_price + $order->shipping_price - $discount;
        
        return [
            'total_price'   => $total_cod, 
            'total_qty'     => $total_qty,
            'total_discount'=> $discount
        ];

    }

    public function update_cod($order_id)
    {
        $total_price = $this->get_upated_order($order_id)->total_price;
        $order = Order::find($order_id);
        $order->cod = $total_price;
        $order->save();
    }

    public function get_edit_customer_section($id)
    {
        $order      = $this->get_upated_order($id);
        $cities     = City::all();
        $template   = view('orders.index.panel.customer_edit', compact('order', 'cities'))->render();
        return response()->json($template, 200);
    }

    public function panel_cancel_reason($order_id, $status_id)
    {
        $status = OrderStatus::find($status_id);
        $canned_messages = OrderCannedMessage::all();
        $template = view('orders.index.panel.reason_screen', compact('status', 'canned_messages', 'order_id'))->render();
        return response()->json($template, 200);
    }

    public function export(Request $request)
    {
        $selected_orders    = $request->orders;
        $courier_format     = $request->courier;
        // Export the orders
        $export = new OrdersExport($selected_orders, $courier_format);
        $orders = $export->collection();

        // Check if there are any orders with status_id 3
        if ($orders->count() === 0) {
            return redirect('/')->with('error', 'No orders with confirmed status found.');
        }

        // Save the exported file
        $file_name = date('d-m-Y') . '.xlsx';
        // Check if the file already exists
        while (Storage::exists('public/exports/' . $file_name)) {
            // If it exists, append a suffix to the filename
            $suffix = isset($suffix) ? $suffix + 1 : 1;
            $file_name = date('d-m-Y') . '-' . $suffix . '.xlsx';
        }

        // Export the orders and store the file
        Excel::store($export, 'public/exports/' . $file_name);
        $url = Storage::url('exports/' . $file_name);

        // Download the saved file
        // return redirect($url)->with('success', 'Orders exported successfully.');
        return response()->json([
            'status' => 'success',
            'message' => 'Orders exported successfully.',
            'url' => $url
        ], 200);
    }

    public function clone_order(Request $request)
    {
        $order = $this->get_upated_order($request->order_id);

        return response()->json($order, 200);
    }

    function check_duplicate($id) {
        // $order  = $this->get_upated_order($id);
        $order  = Order::find($id);
        if($order){
            $hash   = $this->generate_hash($order->id);
            $duplicates = Order::where('hash', $hash)->where('id', '!=', $order->id)->first();
            if($duplicates){
                $order->have_orders = 1;
                $order->save();
            }
            return true;
        }
        
        return response()->json('Order not found with the id ' . $id, 403);
    }

    function generate_hash($id) {
        $model = Order::find($id);
        $order = $this->get_upated_order($model->id);
        $order_string = $order->store_id . $order->customer->name . $order->customer->mobile . $order->customer->alternate_mobile . $order->address->address . $order->address->city;
        $products = '';
        foreach ($order->products as $product) {
            $products .= $product->name . $product->qty; 
        }

        $hash = md5($order_string . $products);

        $model->hash = $hash;
        $model->save();

        return $hash;
    }

    function multiple_orders($id) {
        // $order = $this->get_upated_order($id);
        $order  = Order::find($id);

        $orders = Order::where('customer_id', $order->customer_id)
        ->with('status:id,name AS status,icon,btn_classes,title', 'address', 'products', 'customer', 'city', 'order_customer', 'discounts', 'buttons')
        ->orderBy('status_id')
        ->get();

        foreach ($orders as $order) {
            if ($order->buttons) {
                $availableStatusesIds = $order->buttons->available_buttons;
                $order->available_statuses = OrderStatus::whereIn('id', $availableStatusesIds)->get();
            }
        }

        // $this->check_duplicate($id);
        
        return view('orders.multiple.index', compact('orders'));
    }
}
