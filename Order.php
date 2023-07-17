<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

use App\Models\OrderStatus;
use App\Models\OrderAddress;
use App\Models\OrderProduct;
use App\Models\OrderCustomer;

use App\Models\Customer;
use App\Models\City;

class Order extends Model
{
    use HasFactory;

    protected $fillable = [
        'order_no',
        'site_id',
        'customer_id',
        'cod',
        'shipping_price',
        'issue',
        'remarks',
        'created_by'
    ];

    public function orderStatus()
    {
        return $this->belongsTo(OrderStatus::class, 'status_id', 'id');
    }

    public function status()
    {
        return $this->hasOne(orderStatus::class, 'id', 'status_id')->select('name', 'icon');
    }

    public function address()
    {
        return $this->hasOne(OrderAddress::class, 'order_id', 'id');
    }

    public function products()
    {
        return $this->hasMany(OrderProduct::class, 'order_id', 'id');
    }

    public function customer()
    {
        return $this->hasOne(Customer::class, 'id', 'customer_id');
    }

    public function city()
    {
        return $this->hasOne(City::class, 'id', 'city_id');
    }

    public function order_customer()
    {
        return $this->hasOne(OrderCustomer::class, 'order_id', 'id');
    }

    public function order_cancel()
    {
        return $this->hasOne(OrderCancel::class, 'order_id', 'id');
    }

    public function discounts()
    {
        return $this->hasMany(OrderDiscount::class, 'order_id', 'id');
    }

    public function store()
    {
        return $this->hasOne(Store::class, 'id', 'site_id');
    }

    public function user()
    {
        return $this->belongsTo(User::class, 'belongs_to', 'id');
    }

    public function buttons()
    {
        return $this->belongsTo(OrderStatusButton::class, 'status_id', 'status_id');
    }

    public function courier()
    {
        return $this->hasOne(Courier::class, 'id', 'courier_id');
    }

    public function tracking()
    {
        return $this->hasOne(OrderTracking::class, 'order_id', 'id');
    }

    public function tag()
    {
        return $this->hasOne(OrderTag::class, 'id', 'tag_id');
    }

    




}
