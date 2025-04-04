import { createApp } from "vue"
import { createWebHistory, createRouter } from "vue-router"

import "./main.css"

import App from "./app.vue"
import Dashboard from "./dashboard.vue"
import Auth from "./auth.vue"
import Task from "./task.vue"

const routes = [
	{path: "/auth", component: Auth, name: "auth"},
	{path: "/dashboard", component: Dashboard, name: "dashboard"},
	{path: "/task/:id", component: Task, name: "task"}
];
const router = createRouter({
	history: createWebHistory(),
	routes
});

const app = createApp(App);
app.use(router);
app.mount("#root");