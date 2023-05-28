import { defineConfig } from 'vite';
import laravel, { refreshPaths } from 'laravel-vite-plugin';

export default defineConfig({
    plugins: [
        laravel({
            input: [
                'resources/js/app.js',
                'resources/js/pusher.js',
                'resources/assets/js/app.js',
                'resources/assets/js/users/index.js',
                'resources/assets/js/stores/create.js',
                'resources/js/pages/orders/index.js',
                'resources/js/pages/search/index.js',
                'resources/assets/js/permissions/index.js',
                'resources/js/pages/orders/orderpannel.js',
                'resources/assets/js/export/orders_index.js',
                'resources/assets/css/bootstrap.min.css',
                'resources/assets/css/icons.min.css',
                'resources/assets/css/app.min.css',
                'resources/assets/libs/mobius1-selectr/selectr.min.css',
                'resources/assets/libs/vanillajs-datepicker/css/datepicker.min.css',
                'resources/assets/libs/datatables/css/jquery.dataTables.min.css',
                'resources/assets/libs/simple-datatables/style.css',
                'resources/css/app.css',
                'resources/assets/libs/sweetalert2/sweetalert2.min.css',
                'resources/assets/libs/animate.css/animate.min.css',
                

                'node_modules/jquery/dist/jquery.min.js',
                'node_modules/datatables.net/js/jquery.dataTables.min.js',
                // 'resources/assets/libs/jquery/jquery.min.js',
                // 'resources/assets/libs/datatables/js/jquery.dataTables.min.js',
                'resources/assets/libs/bootstrap/js/bootstrap.bundle.min.js',
                'resources/assets/js/block_ui.js',
                'resources/assets/libs/simplebar/simplebar.min.js',
                'resources/assets/libs/feather-icons/feather.min.js',
                'resources/assets/js/feather.min.js',
                'resources/assets/js/bootstrap.bundle.min.js', 
                'resources/assets/libs/simple-datatables/umd/simple-datatables.js', 
                'resources/assets/js/couriers/add_cols.js',
                'resources/js/pages/orders/booked/index.js',             
                

            ],
            refresh: [
                ...refreshPaths,
                'app/Http/Livewire/**',
            ]
        }),
    ],
}); 