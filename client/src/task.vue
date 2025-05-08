<script>
import Spinner from './shared/spinner.vue'

export default {
	components: { Spinner },
	props: {
		doHistoryBack: Boolean
	},
	data() {
		return {
			task: null,
			loaded: false,
			editing: false,
			form: {
				title: '',
				description: '',
				tags: '',
				state: 0
			}
		}
	},
	methods: {
		loadTask() {
			this.loaded = false;
			const id = this.$route.params.id;
			fetch(`/api/tasks/${id}`)
				.then(res => res.json())
				.then(data => {
					if (!data.error) {
						this.task = data.task;
						this.loaded = true;
					} else {
						this.loaded = true;
					}
				})
				.catch(() => {
					this.loaded = true;
				});
		},
		startEdit() {
			this.editing = true;
			this.form = {
				title: this.task.title,
				description: this.task.description,
				tags: this.task.tags,
				state: this.task.state
			};
		},
		saveEdit() {
			fetch(`/api/tasks/${this.$route.params.id}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(this.form)
			})
				.then(res => res.json())
				.then(() => {
					this.editing = false;
					this.loadTask();
				});
		},
		deleteTask() {
			if (!confirm("Удалить задачу?")) return;

			fetch(`/api/tasks/${this.task.id}`, {
				method: 'DELETE'
			})
			.then(() => {
				if (this.$route.query.offset) {
					this.$router.replace({
						path: '/dashboard',
						query: { offset: this.$route.query.offset }
					});
				} else {
					this.$router.replace('/dashboard');
				}
			});
		},
		stateText(state) {
			switch (state) {
				case 0: return 'Создана';
				case 1: return 'В процессе';
				case 2: return 'Завершена';
				default: return 'Неизвестно';
			}
		},
		stateColor(state) {
			switch (state) {
				case 0: return 'bg-gray-400';
				case 1: return 'bg-yellow-400';
				case 2: return 'bg-green-500';
				default: return 'bg-red-500';
			}
		}
	},
	mounted() {
		this.loadTask();
	}
}
</script>

<template>
	<div class="p-6 space-y-4">
		<!-- Кнопка Назад -->
		<button @click="$router.push('/dashboard')" class="text-blue-600 hover:underline">
			⬅️ Назад к задачам
		</button>

		<!-- Загрузка -->
		<Spinner v-if="!loaded" />

		<div v-else-if="task === null" class="text-center text-red-600 bg-red-50 border border-red-200 p-4 rounded-lg shadow">
			Не удалось загрузить задачу. Возможно, она была удалена или возникла ошибка на сервере.
		</div>

		<!-- Информация о задаче -->
		<div v-else class="bg-white p-6 rounded-xl shadow space-y-4">
			<!-- Заголовок -->
			<div class="flex justify-between items-center">
				<h2 class="text-2xl font-semibold">
					<span v-if="!editing">{{ task.title }}</span>
					<input v-else v-model="form.title" class="text-xl border rounded px-2 py-1 w-full" />
				</h2>

				<!-- Действия -->
				<div class="space-x-2">
					<button v-if="!editing" @click="startEdit" class="text-blue-600 hover:underline">Редактировать</button>
					<button v-if="editing" @click="saveEdit" class="text-green-600 hover:underline">Сохранить</button>
					<button @click="deleteTask" class="text-red-600 hover:underline">Удалить</button>
				</div>
			</div>

			<!-- Автор -->
			<p class="text-sm text-gray-500">
				Автор: {{ task.creator_name || 'удалён' }}
			</p>

			<!-- Статус -->
			<div class="flex items-center gap-2">
				<span
					:class="['w-3 h-3 rounded-full inline-block', stateColor(task.state)]"
				></span>
				<span class="text-sm text-gray-500">
					{{ stateText(task.state) }}
				</span>
			</div>

			<!-- Теги -->
			<div>
				<label class="block text-sm text-gray-500">Теги:</label>
				<p v-if="!editing" class="text-gray-700">{{ task.tags }}</p>
				<input v-else v-model="form.tags" class="w-full px-2 py-1 border rounded" />
			</div>

			<!-- Описание -->
			<div>
				<label class="block text-sm text-gray-500">Описание:</label>
				<p v-if="!editing" class="text-gray-800 whitespace-pre-wrap">{{ task.description }}</p>
				<textarea
					v-else
					v-model="form.description"
					class="w-full px-3 py-2 border rounded min-h-[120px]"
				></textarea>
			</div>

			<!-- Статус (редактируемый) -->
			<div v-if="editing">
				<label class="block text-sm text-gray-500">Статус:</label>
				<select v-model="form.state" class="w-full px-3 py-2 border rounded">
					<option :value="0">Создана</option>
					<option :value="1">В процессе</option>
					<option :value="2">Завершена</option>
				</select>
			</div>
		</div>
	</div>
</template>