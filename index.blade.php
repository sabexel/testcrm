<x-app-layout>
    {{-- <x-slot name="header">
        {{ __('Orders') }}
    </x-slot> --}}
    <div class="row mb-2 mt-2">
        <div class="col-md-12">
            <div class="card mb-0">
                <div class="card-body p-2 stores-list-container">
                    @foreach ($stores as $store)
                        <a href="{{route('orders.index', ['store'=>$store->name])}}" type="button" class="btn btn-sm btn-outline-primary text-capitalize me-1 store-btn {{$store_in_url == $store->name ? 'active' : ''}}" data-store="{{$store->id}}">
                            <span class="store-name">{{$store->name}}</span>
                            <span class="badge {{$store_in_url == $store->name ? 'bg-light text-primary' : 'bg-primary text-white'}} ms-1">{{$store->orders_count}}</span>
                        </a>
                    @endforeach
                </div>
            </div>                                         
        </div>
    </div> <!--end row-->
    <div class="card  mb-2">
        <div class="card-bddy">
            <form action="#" method="get" id="orders-filters">
                <div class="accordion accordion-flush" id="accordionFlushExample">
                    <div class="accordion-item">
                        <h5 class="accordion-header m-0" id="flush-headingOne">
                            <button class="accordion-button collapsed fw-semibold" type="button" data-bs-toggle="collapse" data-bs-target="#flush-collapseOne" aria-expanded="false" aria-controls="flush-collapseOne">
                                Filters
                            </button>
                        </h5>
                        <div id="flush-collapseOne" class="accordion-collapse collapse" aria-labelledby="flush-headingOne" data-bs-parent="#accordionFlushExample">
                            <div class="accordion-body">
                                <div class="row">
                                    <div class="col-md-2">
                                        <select id="default">
                                            <option value="">Select Product</option>
                                            @foreach ($products as $product)
                                                <option value="{{$product->id}}">{{$product->name}}</option>
                                            @endforeach
                                        </select>                                    
                                    </div><!-- end col -->                                     
                                    <div class="col-md-2">
                                        <select id="multiSelect">
                                            @foreach ($cities as $city)
                                                <option value="{{$city->id}}">{{$city->name}}</option>
                                            @endforeach
                                        </select>         
                                    </div> <!-- end col -->  
                                    <div class="col-md-2 d-none">
                                        <select id="multiSelect2">
                                            <option value="value-1">Value 1</option>
                                            <option value="value-2">Value 2</option>
                                            <option value="value-3">Value 3</option>
                                        </select>         
                                    </div> <!-- end col -->
                                    <div class="col-md-4 d-none">
                                        <div class="input-group" id="DateRange">
                                            <input type="text" class="form-control" placeholder="Start" aria-label="StartDate">
                                            <span class="input-group-text">to</span>
                                            <input type="text" class="form-control" placeholder="End" aria-label="EndDate">
                                        </div> 
                                    </div><!-- end col -->                                                
                                </div><!-- end row -->
                                <div class="row">
                                    <div class="col text-end">
                                        <button type="submit" class="btn btn-soft-primary">Filter</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </form>
        </div>
    </div>

    <div class="row mb-2">
        <div class="col-lg-12">
            <div class="d-flex align-items-center">
                <div class="status-nav-container">
                    <ul class="nav nav-tabs mb-0 status-links" id="status-links">
                        @foreach ($statuses['statuses'] as $o_status)
                        <li class="nav-item">
                            <a class="nav-link text-uppercase {{$status == $o_status->name ? 'active' : ''}}" data-status="{{$o_status->name}}" href="{{route('orders.index', ['store' => $store_in_url, 'status' => $o_status->name])}}">
                                <i class="me-1  {{$o_status->icon}}"></i>{{$o_status->title}}
                                @if ($o_status->id == 1)
                                <span class="ms-1 status-counter">({{$statuses['new_orders']}})</span>
                                @else
                                <span class="ms-1 status-counter">({{$o_status->orders_count}})</span> 
                                @endif
                            </a>
                        </li>
                        @endforeach
                    </ul>
                </div>
                <div class="ms-auto">
                  <label class="visually-hidden" for="order-search-field">Search</label>
                  <div class="input-group">
                    <div class="input-group-text">Search</div>
                    <input type="text" class="form-control" id="order-search-field" placeholder="Search anything">
                  </div>
                </div>
            </div>
        </div>
    </div>

    <div class="row">
        <div class="col-lg-12">
            <div class="card">
                <div class="card-body p-0">
                    <div class="table-responsive">
                        <table class="table table-bordered mb-0 table-centered table-striped" id="orders-main-table" data-url="{{route('orders.list', ['store' => $store_in_url])}}">
                            <thead>
                            <tr>
                                <th></th>
                                <th>Date</th>
                                <th>Name</th>
                                <th>Mobile</th>
                                <th>Address</th>
                                <th>City</th>
                                <th>Product</th>
                                <th>COD</th>
                                <th>OS</th>
                                <th>Action</th>
                                <th>Reason / Agent</th>
                            </tr>
                            </thead>

                            <tfoot>
                                <tr>
                                    <th></th>
                                    <th>Date</th>
                                    <th>Name</th>
                                    <th>Mobile</th>
                                    <th>Address</th>
                                    <th>City</th>
                                    <th>Product</th>
                                    <th>COD</th>
                                    <th>OS</th>
                                    <th>Action</th>
                                    <th>Reason / Agent</th>
                                </tr>
                                </tfoot>
                        </table><!--end /table-->
                    </div><!--end /tableresponsive-->
                </div><!--end card-body-->
            </div><!--end card-->
        </div> <!-- end col -->
    </div> <!-- end row -->
    <div id="panel" style="display:none;"></div>
    @include('orders.index.modals')
    <input type="hidden" name="auth_key" value="{{Auth::user()->createToken('token-name')->plainTextToken}}"/>

    <script>
        window.Laravel = {!! json_encode([
            'csrfToken' => csrf_token(),
            'user' => [
                'data' => auth()->user(),
                'permissions' => auth()->user()->getAllPermissions()->pluck('name')->toArray(),
            ],
        ]) !!};
    </script>
    <x-slot name="pageScripts">
       @vite([
        'resources/js/pages/orders/index.js',
        'resources/js/pages/orders/orderpannel.js',
        'resources/assets/libs/mobius1-selectr/selectr.min.css',
        'resources/assets/libs/vanillajs-datepicker/css/datepicker.min.css',
        'resources/assets/libs/datatables/css/jquery.dataTables.min.css',
        'resources/assets/libs/simple-datatables/style.css',
       ])
    </x-slot>
</x-app-layout>

