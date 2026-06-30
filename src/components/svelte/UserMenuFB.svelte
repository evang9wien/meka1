<script>
  import { onMount } from 'svelte';
  import { getAuth, signOut } from 'firebase/auth';
  import { initAuth, currentUser, userRoles, userProfile, authReady } from './stores/authStore.js';
  import { initAppCheck } from './firebase/firebase.js';
  import LoginFire from './auth/LoginFire.svelte';

  let open = false;
  let buttonEl;
  let popupEl;

  onMount(() => {
    initAuth();

    const handleClickOutside = (e) => {
      if (open && buttonEl && popupEl && !buttonEl.contains(e.target) && !popupEl.contains(e.target)) {
        open = false;
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  });

  const toggle = () => { open = !open; };

  const logout = async () => {
    const app = initAppCheck();
    const auth = getAuth(app);
    await signOut(auth);
    open = false;
    window.location.reload();
  };

  // Rollen-Label aus bekannten IDs
  const ROLE_LABELS = {
    admin:             'Admin',
    combo:             'Combo',
    comboedit:         'Combo Edit',
    comboadmin:        'Combo Admin',
    terminadmin:       'Termin Admin',
    combolist:         'Liederliste',
    liederedit:        'Lieder Edit',
    liederauswahledit: 'Liederauswahl Edit',
    predigtedit:       'Predigt Edit',
    kirchenservice:    'Kirchenservice',
  };
  const roleLabel = (id) => ROLE_LABELS[id] ?? id;

  $: displayName = $userProfile
    ? ([($userProfile.VName ?? ''), ($userProfile.FName ?? '')].filter(Boolean).join(' ') || $userProfile.email || $currentUser?.email || '')
    : ($currentUser?.email ?? '');
</script>

<!-- Icon ist immer sichtbar sobald Auth-Status bekannt ist (auch wenn nicht eingeloggt) -->
{#if $authReady}
  <div class="relative" style="display:inline-block">

    <!-- Icon-Button -->
    <button
      bind:this={buttonEl}
      onclick={toggle}
      aria-label="Benutzerprofil"
      class="text-muted dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-4 focus:ring-gray-200 dark:focus:ring-gray-700 rounded-lg text-sm p-2.5 inline-flex items-center"
    >
      <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="8" r="4"/>
        <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
      </svg>
    </button>

    {#if open}
      <div
        bind:this={popupEl}
        class="absolute right-0 mt-2 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl overflow-hidden"
        style="min-width: 280px;"
      >

        {#if $currentUser}
          <!-- ── Eingeloggt: Profil ── -->
          <div class="p-4">
            <!-- Avatar + Name -->
            <div class="flex items-center gap-3 mb-4 pb-4 border-b border-gray-200 dark:border-gray-700">
              <div class="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-600 dark:text-blue-300 font-bold text-sm flex-shrink-0">
                {displayName.charAt(0).toUpperCase()}
              </div>
              <div class="overflow-hidden">
                <div class="font-semibold text-sm text-gray-900 dark:text-white truncate">{displayName}</div>
                <div class="text-xs text-gray-500 dark:text-gray-400 truncate">{$currentUser.email ?? ''}</div>
              </div>
            </div>

            <!-- Rollen -->
            {#if $userRoles.length > 0}
              <div class="mb-4 pb-4 border-b border-gray-200 dark:border-gray-700">
                <div class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Rollen</div>
                <div class="flex flex-wrap gap-1">
                  {#each $userRoles as roleId}
                    <span class="inline-block px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-xs font-medium">
                      {roleLabel(roleId)}
                    </span>
                  {/each}
                </div>
              </div>
            {/if}

            <!-- Abmelden -->
            <button
              onclick={logout}
              class="w-full text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg px-3 py-2 font-medium transition-colors"
            >
              Abmelden
            </button>
          </div>

        {:else}
          <!-- ── Nicht eingeloggt: Login-Formular ── -->
          <div class="p-4">
            <p class="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-0.5">Mitarbeiter-Login</p>
            <p class="text-xs text-gray-500 dark:text-gray-400 mb-4">Bitte anmelden um fortzufahren.</p>
            <LoginFire loginReload={true} />
          </div>
        {/if}

      </div>
    {/if}
  </div>
{/if}
