<?php

use App\Http\Middleware\EnsureAdminRole;
use App\Http\Middleware\HandleAppearance;
use App\Http\Middleware\HandleInertiaRequests;
use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\Response as SymfonyResponse;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withSchedule(function (Schedule $schedule): void {
        // Requires `php artisan schedule:run` to actually be invoked once a minute —
        // see the `scheduler` service in docker-compose.yml.
        $schedule->command('invites:send-scheduled')->everyMinute()->withoutOverlapping();
    })
    ->withMiddleware(function (Middleware $middleware): void {
        // Nginx and any HTTPS-terminating proxy in front of it (cloudflared tunnel,
        // Cloudflare, a load balancer) sit as an untrusted layer to Laravel by default,
        // so without this every asset()/URL::to() call falls back to http:// and
        // browsers block them as mixed content on an https:// page.
        $middleware->trustProxies(at: '*');

        $middleware->alias(['admin.role' => EnsureAdminRole::class]);

        $middleware->encryptCookies(except: ['appearance', 'sidebar_state']);

        // Wablas' incoming-message webhook is an external POST with no CSRF token —
        // authenticity is instead verified via the `key` query param secret.
        $middleware->validateCsrfTokens(except: ['webhooks/*']);

        $middleware->web(append: [
            HandleAppearance::class,
            HandleInertiaRequests::class,
            AddLinkHeadersForPreloadedAssets::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*') || $request->expectsJson(),
        );

        // Renders a branded error page instead of Laravel's default view, for both hard
        // page loads and Inertia XHR visits alike.
        $exceptions->respond(function (SymfonyResponse $response, Throwable $exception, Request $request) {
            if ($request->is('api/*') || $request->expectsJson()) {
                return $response;
            }

            $status = $response->getStatusCode();

            // 403/404/419/429 are expected UX flows — always branded. 500/503 keep
            // Laravel's debug page in local/testing.
            $alwaysBranded = in_array($status, [403, 404, 419, 429], true);
            $brandedInProd = in_array($status, [500, 503], true) && ! app()->environment(['local', 'testing']);

            if ($alwaysBranded || $brandedInProd) {
                return Inertia::render('errors/error', [
                    'status' => $status,
                    'message' => $exception->getMessage() ?: null,
                ])
                    ->toResponse($request)
                    ->setStatusCode($status);
            }

            return $response;
        });
    })->create();
