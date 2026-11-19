<script lang="ts" generics="T extends object">
	import Pagination from './Pagination.svelte';
	import Button from './Button.svelte';
	import Dropdown from './Dropdown.svelte';
	import { uiLanguage } from '../api/locales';
	import { boComponentCopy } from './texts';
	import type {
		DataAction,
		DataColumn,
		DataFilter,
		DataTablePagination,
		SortOrder
	} from './data-table';
	import { displayCell, nextSort } from './data-table';

	let {
		rows,
		columns,
		actions = [],
		filters = [],
		filterValues = {},
		sortKey = null,
		sortOrder = 'asc',
		pagination,
		loading = false,
		emptyMessage,
		rowKey = 'id',
		onSortChange,
		onFilterChange
	}: {
		rows: T[];
		columns: DataColumn<T>[];
		actions?: DataAction<T>[];
		filters?: DataFilter[];
		filterValues?: Record<string, string>;
		sortKey?: string | null;
		sortOrder?: SortOrder;
		pagination?: DataTablePagination;
		loading?: boolean;
		emptyMessage?: string;
		rowKey?: string;
		onSortChange?: (key: string, order: SortOrder) => void;
		onFilterChange?: (key: string, value: string) => void;
	} = $props();

	const t = $derived(boComponentCopy($uiLanguage));

	function changeSort(column: DataColumn<T>) {
		if (loading || !column.sortable || !onSortChange) return;
		const next = nextSort(column.key, sortKey, sortOrder);
		onSortChange(next.key, next.order);
	}

	function changeFilter(key: string, value: string) {
		onFilterChange?.(key, value);
	}
</script>

<div class="bo-data-table">
	{#if filters.length > 0}
		<div class="bo-data-table-filters" role="group" aria-label={t.filters}>
			{#each filters as filter (filter.key)}
				<label class="bo-data-table-filter">
					<span>{filter.label}</span>
					{#if filter.type === 'search'}
						<input
							type="search"
							value={filterValues[filter.key] ?? ''}
							placeholder={filter.placeholder ?? ''}
							disabled={loading}
							oninput={(event) => changeFilter(filter.key, event.currentTarget.value)}
						/>
					{:else}
						<div class="bo-data-table-filter-select">
							<Dropdown
								value={filterValues[filter.key] ?? ''}
								options={[
									{ value: '', label: filter.placeholder ?? t.all },
									...(filter.options ?? [])
								]}
								label={filter.label}
								disabled={loading}
								onChange={(value) => changeFilter(filter.key, value)}
							/>
						</div>
					{/if}
				</label>
			{/each}
		</div>
	{/if}

	<div class="bo-data-table-scroll">
		<table aria-busy={loading}>
			<thead>
				<tr>
					{#each columns as column (column.key)}
						<th
							scope="col"
							class:bo-data-table-right={column.align === 'right'}
							class:bo-data-table-center={column.align === 'center'}
							aria-sort={column.sortable && sortKey === column.key
								? sortOrder === 'asc'
									? 'ascending'
									: 'descending'
								: undefined}
						>
							{#if column.sortable && onSortChange}
								<Button
									type="button"
									class="bo-data-table-sort"
									disabled={loading}
									onclick={() => changeSort(column)}
								>
									{column.label}
									{#if sortKey === column.key}{sortOrder === 'asc' ? ' ↑' : ' ↓'}{/if}
								</Button>
							{:else}
								{column.label}
							{/if}
						</th>
					{/each}
					{#if actions.length > 0}<th scope="col">{t.actions}</th>{/if}
				</tr>
			</thead>
			<tbody>
				{#each rows as row, index (String((row as Record<string, unknown>)[rowKey] ?? index))}
					<tr>
						{#each columns as column (column.key)}
							<td
								class:bo-data-table-right={column.align === 'right'}
								class:bo-data-table-center={column.align === 'center'}
							>
								{displayCell(column, row, { yes: t.yes, no: t.no })}
							</td>
						{/each}
						{#if actions.length > 0}
							<td class="bo-data-table-actions">
								{#each actions as action (action.key)}
									<Button
										type="button"
										disabled={loading || action.disabled?.(row)}
										onclick={() => action.onClick(row)}
										>{typeof action.label === 'function' ? action.label(row) : action.label}</Button
									>
								{/each}
							</td>
						{/if}
					</tr>
				{:else}
					<tr
						><td colspan={columns.length + (actions.length > 0 ? 1 : 0)} class="bo-data-table-empty"
							>{loading ? t.loading : (emptyMessage ?? t.empty)}</td
						></tr
					>
				{/each}
			</tbody>
		</table>
	</div>

	{#if pagination}
		<Pagination
			page={pagination.page}
			limit={pagination.limit}
			total={pagination.total}
			{loading}
			onPageChange={pagination.onPageChange}
			onLimitChange={pagination.onLimitChange}
		/>
	{/if}
</div>
