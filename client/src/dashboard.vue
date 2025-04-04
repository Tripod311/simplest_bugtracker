<style>
@import url('https://fonts.googleapis.com/icon?family=Material+Icons'); /* для иконки меню */
</style>


<script>
import Tasks from './tasks.vue'
import Users from './users.vue'

export default {
	components: { Tasks, Users },
	data() {
		return {
			current: 'tasks',
			menuOpen: false
		}
	},
	methods: {
		select(section) {
			this.current = section
		},
		logout() {
			fetch('/api/logout', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: '{}'
			}).then(() => location.reload());
		},
		buttonClass(name) {
			return this.current === name
				? 'font-semibold text-blue-400 hover:text-blue-300'
				: 'hover:text-gray-300';
		}
	}
}
</script>

<template>
	<div class="flex flex-col h-full">
		<!-- Меню -->
		<nav class="bg-gray-900 text-white px-4 py-3 flex items-center justify-between">
			<div class="text-xl font-bold">Dashboard</div>
			<div class="md:hidden">
				<button @click="menuOpen = !menuOpen">
					<span class="material-icons">menu</span>
				</button>
			</div>
			<div class="hidden md:flex gap-4">
				<button @click="select('tasks')" :class="buttonClass('tasks')">Tasks</button>
				<button @click="select('users')" :class="buttonClass('users')">Users</button>
				<button @click="logout" class="text-red-400 hover:text-red-300">Logout</button>
			</div>
		</nav>

		<!-- Мобильное меню -->
		<div v-if="menuOpen" class="md:hidden bg-gray-800 text-white flex flex-col gap-2 p-4">
			<button @click="select('tasks'); menuOpen = false" :class="buttonClass('tasks')">Tasks</button>
			<button @click="select('users'); menuOpen = false" :class="buttonClass('users')">Users</button>
			<button @click="logout" class="text-red-400 hover:text-red-300">Logout</button>
		</div>

		<!-- Основной контент -->
		<div class="flex-1 overflow-auto p-6 bg-gray-100">
			<Tasks v-if="current === 'tasks'" />
			<Users v-if="current === 'users'" />
			<div v-if="!current" class="text-center text-gray-500">Выберите раздел из меню</div>
		</div>
	</div>
</template>