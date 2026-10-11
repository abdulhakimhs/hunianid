<?php

namespace Tests\Feature;

use Tests\TestCase;

class PwaManifestTest extends TestCase
{
    public function test_homepage_does_not_advertise_a_pwa_manifest(): void
    {
        $this->get('/')
            ->assertOk()
            ->assertDontSee('rel="manifest"');
    }

    public function test_security_entry_page_advertises_the_security_manifest(): void
    {
        $this->get('/login-security')
            ->assertOk()
            ->assertSee('href="/manifest-security.webmanifest"', false);
    }

    public function test_unauthenticated_security_visit_redirects_to_the_security_login(): void
    {
        $this->get('/security')->assertRedirect('/login-security');
    }

    public function test_tenant_page_advertises_the_tenant_manifest(): void
    {
        $this->get('/tenant/visitor-pass')
            ->assertOk()
            ->assertSee('href="/manifest-tenant.webmanifest"', false);
    }
}
