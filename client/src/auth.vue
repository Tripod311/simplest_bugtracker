<script>
export default {
	data() {
		return {
			login: '',
			password: '',
			error: ''
		};
	},
	methods: {
		submit() {
			this.error = '';

			fetch('/api/auth', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					login: this.login,
					password: this.password
				})
			})
			.then(res => res.json())
			.then(data => {
				if (data.error) {
					this.error = data.details || 'Неверный логин или пароль';
				} else {
					this.$router.replace('/dashboard');
				}
			})
			.catch(err => {
				console.error(err);
				this.error = 'Ошибка запроса';
			});
		}
	},
	mounted() {
		fetch("/api/verify", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: "{}"
		})
		.then(res => res.json())
		.then(data => {
			if (!data.error) {
				this.$router.replace("/dashboard");
			}
		});
	}
};
</script>

<template>
	<div class="flex items-center justify-center h-full bg-gray-100">
		<div class="w-full max-w-sm p-6 bg-white rounded-2xl shadow-xl">
			<h2 class="text-2xl font-semibold mb-6 text-center">Авторизация</h2>
			
			<div class="mb-4">
				<label class="block mb-1 text-sm font-medium text-gray-700">Логин</label>
				<input
					type="text"
					v-model="login"
					class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring focus:border-blue-400"
				/>
			</div>

			<div class="mb-6">
				<label class="block mb-1 text-sm font-medium text-gray-700">Пароль</label>
				<input
					type="password"
					v-model="password"
					class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring focus:border-blue-400"
				/>
			</div>

			<button
				@click="submit"
				class="w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
			>
				Войти
			</button>

			<p v-if="error" class="mt-4 text-sm text-red-600 text-center">
				{{ error }}
			</p>
		</div>
	</div>
</template>