<template>
  <div class="min-h-screen bg-slate-50 text-slate-900">
    <header class="border-b border-slate-200 bg-white">
      <div
        class="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-4 sm:px-6"
      >
        <h1 class="text-lg font-semibold">Vacation Management</h1>
        <nav class="flex items-center gap-4 text-sm text-slate-600">
          <RouterLink class="hover:text-slate-900" to="/login"
            >Login</RouterLink
          >
          <RouterLink class="hover:text-slate-900" to="/requester"
            >Requester</RouterLink
          >
          <RouterLink class="hover:text-slate-900" to="/validator"
            >Validator</RouterLink
          >
        </nav>
      </div>
    </header>

    <main class="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
      <slot />
    </main>
  </div>
</template>
