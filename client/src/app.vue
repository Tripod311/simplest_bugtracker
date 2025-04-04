<style lang="scss">
	html, body {
		width: 100%;
		height: 100%;
		overflow: hidden;
		margin: 0;
		padding: 0;
	}

	#root {
		width: 100%;
		height: 100%;
	}

	div, span, input {
		box-sizing: border-box;
	}
</style>

<script>
	import Spinner from "./shared/spinner.vue"
	import {RouterView} from "vue-router"

	export default {
		components: {Spinner},
		data () {
			return {
				loaded: false
			}
		},
		mounted () {
			fetch("/api/verify", {
				method: "POST",
				body: "{}",
				headers: {
					"Content-Type": "application/json"
				}
			}).then((response) => response.json()).then(data => {
				if (!data || data.error) {
					this.$router.replace("/auth");
				} else {
					const path = this.$router.currentRoute.value.path;
					if (path === "/" || path === "") {
						this.$router.replace("/dashboard");
					}
					// если путь не пустой, оставляем как есть
				}

				this.loaded = true;
			}).catch(() => {
				this.$router.replace("/auth");
				this.loaded = true;
			});
		}
	}
</script>

<template>
	<RouterView />
	<Spinner v-if="!loaded" />
</template>