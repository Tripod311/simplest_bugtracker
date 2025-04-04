<script>
import Spinner from './shared/spinner.vue';

export default {
	components: { Spinner },
	data() {
		return {
			loaded: false,
			tasks: [],
			lastTaskId: null,
			canGoBack: false,
			canGoForward: true,
			showAddDialog: false,
			newTask: {
				title: '',
				description: '',
				tags: ''
			},
			filterState: '',
			filterTag: '',
			stack: [] // для сохранения id предыдущих страниц (пагинация)
		};
	},
	methods: {
		scheduleApplyFilters () {
			clearTimeout(this.timeout);
			this.timeout = setTimeout(this.applyFilters.bind(this), 200);
		},
		applyFilters() {
			this.stack = [];
			this.loadTasks();
		},
		loadTasks(lastId = null) {
			this.loaded = false;

			let url = '/api/tasks';
			const params = new URLSearchParams();

			if (this.filterState !== '') {
				params.append('state', this.filterState);
			}
			if (this.filterTag.trim() !== '') {
				params.append('tag', this.filterTag.trim());
			}
			if (lastId) {
				params.append('last_id', lastId);
			}

			if ([...params].length > 0) {
				url += `?${params.toString()}`;
			}

			fetch(url)
				.then(res => res.json())
				.then(data => {
					if (data.error) throw new Error(data.details);
					this.tasks = data.tasks;
					this.canGoForward = data.tasks.length === 20;
					this.loaded = true;
				})
				.catch(() => {
					this.tasks = [];
					this.loaded = true;
				});
		},
		openTask(id) {
			this.$router.push(`/task/${id}`);
		},
		nextPage() {
			if (this.tasks.length === 0) return;
			this.stack.push(this.tasks[0].id);
			this.lastTaskId = this.tasks[this.tasks.length - 1].id;
			this.loadTasks(this.lastTaskId);
			this.canGoBack = true;
		},
		prevPage() {
			const last = this.stack.pop();
			this.loadTasks(last);
			this.canGoBack = this.stack.length > 0;
		},
		addTask() {
			const { title, description, tags } = this.newTask;
			if (!title) return;

			this.loaded = false;
			this.showAddDialog = false;

			fetch('/api/tasks', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ title, description, tags })
			})
				.then(res => res.json())
				.then(() => {
					this.newTask = { title: '', description: '', tags: '' };
					this.stack = [];
					this.loadTasks();
				})
				.catch(() => {
					this.loaded = true;
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
		this.loadTasks();
	},
	beforeUnmount() {
		clearTimeout(this.timeout);
	}
}
</script>

<template>
	<div>
		<Spinner v-if="!loaded" />

		<div v-else>
			<div class="flex justify-between items-center mb-4">
				<h2 class="text-xl font-semibold">Задачи</h2>
				<button @click="showAddDialog = true" class="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-500">
					Добавить задачу
				</button>
			</div>

			<!-- Фильтры -->
			<div class="flex flex-col md:flex-row md:items-end gap-4 mb-4">
				<div>
					<label class="block text-sm text-gray-600 mb-1">Статус</label>
					<select v-model="filterState" @change="scheduleApplyFilters" class="w-full px-3 py-2 border rounded">
						<option value="">Все</option>
						<option value="0">Создана</option>
						<option value="1">В процессе</option>
						<option value="2">Завершена</option>
					</select>
				</div>

				<div>
					<label class="block text-sm text-gray-600 mb-1">Тег</label>
					<input v-model="filterTag" @input="scheduleApplyFilters" type="text" class="w-full px-3 py-2 border rounded" placeholder="поиск по тегу..." />
				</div>
			</div>

			<!-- Нет задач -->
			<div v-if="tasks.length === 0" class="text-gray-500 text-center mt-10">
				Задачи не найдены
			</div>

			<div v-else>

				<!-- Список задач -->
				<div class="grid gap-4">
					<div
						v-for="task in tasks"
						:key="task.id"
						@click="openTask(task.id)"
						class="cursor-pointer p-4 bg-white rounded-xl shadow hover:bg-blue-50 transition"
					>
						<div class="flex justify-between items-center">
							<h3 class="text-lg font-semibold">{{ task.title }}</h3>
							<span class="text-sm text-gray-400">{{ task.creator_name || 'удалён' }}</span>
						</div>
						<div class="flex items-center gap-4 mt-1">
							<!-- Состояние -->
							<div class="flex items-center gap-2">
								<span
									:class="[
										'inline-block w-3 h-3 rounded-full',
										stateColor(task.state)
									]"
								></span>
								<span class="text-sm text-gray-500">{{ stateText(task.state) }}</span>
							</div>

							<!-- Теги -->
							<div class="text-sm text-gray-600 truncate">
								{{ task.tags }}
							</div>
						</div>
					</div>
				</div>
			</div>

			<!-- Пагинация -->
			<div class="flex justify-center items-center mt-6 gap-4">
				<button
					@click="prevPage"
					:disabled="!canGoBack"
					class="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300 disabled:opacity-50"
				>
					⬅️
				</button>
				<button
					@click="nextPage"
					:disabled="!canGoForward"
					class="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300 disabled:opacity-50"
				>
					➡️
				</button>
			</div>

			<!-- Диалог добавления -->
			<div v-if="showAddDialog" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
				<div class="bg-white p-6 rounded-xl shadow w-full max-w-md space-y-4">
					<h3 class="text-lg font-semibold">Добавить задачу</h3>
					<input type="text" v-model="newTask.title" placeholder="Заголовок" class="w-full px-3 py-2 border rounded" />
					<input type="text" v-model="newTask.tags" placeholder="Теги" class="w-full px-3 py-2 border rounded" />
					<textarea v-model="newTask.description" placeholder="Описание" class="w-full px-3 py-2 border rounded" />
					<div class="flex justify-end space-x-2">
						<button @click="showAddDialog = false" class="px-4 py-2 bg-gray-300 rounded">Отмена</button>
						<button @click="addTask" class="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-500">Добавить</button>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>