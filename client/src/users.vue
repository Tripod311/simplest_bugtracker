<script>
import Spinner from './shared/spinner.vue';

export default {
	components: { Spinner },
	data() {
		return {
			loaded: false,
			users: [],
			passwords: {},
			error: '',
			showAddDialog: false,
			newUser: {
				name: '',
				password: ''
			}
		}
	},
	methods: {
		loadUsers() {
			this.loaded = false;
			this.error = '';

			fetch('/api/users')
				.then(res => res.json())
				.then(data => {
					if (data.error) {
						this.error = data.details;
					} else {
						this.users = data.rows;
						this.passwords = {};
						this.users.forEach(u => this.passwords[u.id] = '');
						this.loaded = true;
					}
				})
				.catch(err => {
					this.error = 'Ошибка загрузки пользователей';
					this.loaded = true;
				});
		},

		updateUser(userId) {
			const password = this.passwords[userId];
			if (!password) return;

			this.loaded = false;
			this.error = '';

			fetch(`/api/users/${userId}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ password })
			})
				.then(res => res.json())
				.then(data => {
					if (data.error) {
						this.error = data.details || 'Ошибка при обновлении';
					}
					this.loadUsers();
				})
				.catch(() => {
					this.error = 'Ошибка при обновлении';
					this.loaded = true;
				});
		},

		deleteUser(userId) {
			this.loaded = false;
			this.error = '';

			fetch(`/api/users/${userId}`, {
				method: 'DELETE'
			})
				.then(res => res.json())
				.then(data => {
					if (data.error) {
						this.error = data.details || 'Ошибка при удалении';
					}
					this.loadUsers();
				})
				.catch(() => {
					this.error = 'Ошибка при удалении';
					this.loaded = true;
				});
		},

		addUser() {
			const { name, password } = this.newUser;
			if (!name || !password) return;

			this.loaded = false;
			this.error = '';
			this.showAddDialog = false;

			fetch('/api/users', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name, password })
			})
				.then(res => res.json())
				.then(data => {
					if (data.error) {
						this.error = data.details || 'Ошибка при добавлении';
					}
					this.newUser = { name: '', password: '' };
					this.loadUsers();
				})
				.catch(() => {
					this.error = 'Ошибка при добавлении';
					this.loaded = true;
				});
		}
	},
	mounted() {
		this.loadUsers();
	}
};
</script>

<template>
	<div>
		<Spinner v-if="!loaded" />

		<div v-else class="space-y-4">
			<!-- Ошибка -->
			<p v-if="error" class="text-red-600">{{ error }}</p>
			<!-- Таблица пользователей -->
			<table class="w-full table-auto border-collapse bg-white shadow rounded-lg">
				<thead class="bg-gray-100">
					<tr>
						<th class="text-left p-3">Имя</th>
						<th class="text-left p-3">Новый пароль</th>
						<th class="p-3 text-center">Действия</th>
					</tr>
				</thead>
				<tbody>
					<tr v-for="user in users" :key="user.id" class="border-t">
						<td class="p-3">{{ user.name }}</td>
						<td class="p-3">
							<input type="text" v-model="passwords[user.id]" class="w-full px-2 py-1 border rounded" />
						</td>
						<td class="p-3 text-center space-x-2">
							<button @click="updateUser(user.id)" class="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-500">Update</button>
							<button @click="deleteUser(user.id)" class="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-500">Delete</button>
						</td>
					</tr>
				</tbody>
			</table>

			<!-- Кнопка добавления -->
			<div>
				<button @click="showAddDialog = true" class="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-500">Добавить пользователя</button>
			</div>
		</div>

		<!-- Диалог добавления -->
		<div v-if="showAddDialog" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
			<div class="bg-white p-6 rounded-xl shadow w-full max-w-md space-y-4">
				<h3 class="text-lg font-semibold">Добавить пользователя</h3>
				<input type="text" v-model="newUser.name" placeholder="Имя" class="w-full px-3 py-2 border rounded" />
				<input type="password" v-model="newUser.password" placeholder="Пароль" class="w-full px-3 py-2 border rounded" />
				<div class="flex justify-end space-x-2">
					<button @click="showAddDialog = false" class="px-4 py-2 bg-gray-300 rounded">Отмена</button>
					<button @click="addUser" class="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-500">Добавить</button>
				</div>
			</div>
		</div>
	</div>
</template>