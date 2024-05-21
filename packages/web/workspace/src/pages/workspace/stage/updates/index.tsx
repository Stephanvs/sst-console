import { For, Show, createEffect, createMemo } from "solid-js";
import { Link } from "@solidjs/router";
import { DateTime } from "luxon";
import { styled } from "@macaron-css/solid";
import { Row, Tag, Text, Stack, theme, utility, LinkButton } from "$/ui";
import { Dropdown } from "$/ui/dropdown";
import { IconEllipsisVertical } from "$/ui/icons";
import { inputFocusStyles } from "$/ui/form";
import { formatSinceTime, parseTime } from "$/common/format";
import { StateUpdateStore } from "$/data/app";
import { useReplicache } from "$/providers/replicache";
import { useStageContext } from "../context";
import { sortBy } from "remeda";

const LEGEND_WIDTH = 100;

const CMD_MAP = {
  deploy: "sst deploy",
  refresh: "sst refresh",
  remove: "sst remove",
  edit: "sst state edit",
};

const STATUS_MAP = {
  queued: "Queued",
  canceled: "Canceled",
  updated: "Complete",
  error: "Error",
  updating: "In Progress",
};

const Content = styled("div", {
  base: {
    padding: theme.space[4],
  },
});

const UpdateRoot = styled("div", {
  base: {
    ...utility.row(4),
    justifyContent: "space-between",
    padding: theme.space[4],
    alignItems: "center",
    borderStyle: "solid",
    borderWidth: "0 1px 1px 1px",
    borderColor: theme.color.divider.base,
    position: "relative",
    ":first-child": {
      borderWidth: 1,
      borderTopLeftRadius: theme.borderRadius,
      borderTopRightRadius: theme.borderRadius,
    },
    ":last-child": {
      borderBottomLeftRadius: theme.borderRadius,
      borderBottomRightRadius: theme.borderRadius,
    },
    selectors: {
      "&[data-focus='true']": {
        ...inputFocusStyles,
        outlineOffset: -1,
      },
    },
  },
});

const UpdateCol = styled("div", {
  base: {
    minWidth: 0,
  },
});

const UpdateStatus = styled(UpdateCol, {
  base: {
    ...utility.row(3),
    width: 320,
    alignItems: "center",
  },
});

const UpdateStatusIcon = styled("div", {
  base: {
    width: 12,
    height: 12,
    borderRadius: "50%",
  },
  variants: {
    status: {
      queued: {
        backgroundColor: theme.color.divider.base,
      },
      canceled: {
        backgroundColor: theme.color.divider.base,
      },
      updated: {
        backgroundColor: `hsla(${theme.color.base.blue}, 100%)`,
      },
      error: {
        backgroundColor: `hsla(${theme.color.base.red}, 100%)`,
      },
      updating: {
        backgroundColor: `hsla(${theme.color.base.brand}, 100%)`,
      },
    },
  },
});

const UpdateLink = styled(Link, {
  base: {
    fontWeight: theme.font.weight.medium,
  },
});

const UpdateLinkPrefix = styled("span", {
  base: {
    fontWeight: theme.font.weight.regular,
    fontSize: theme.font.size.sm,
  },
});

const UpdateStatusCopy = styled("p", {
  base: {
    fontSize: theme.font.size.xs,
    color: theme.color.text.dimmed.base,
  },
});

const UpdateRightCol = styled(UpdateCol, {
  base: {
    ...utility.row(3),
    width: 280,
    alignItems: "center",
    justifyContent: "space-between",
  },
});

const UpdateChangeTagsRoot = styled("div", {
  base: {
    ...utility.row("px"),
  },
});

const UpdateChangeTag = styled("div", {
  base: {
    height: 16,
    lineHeight: 1,
    display: "flex",
    alignItems: "center",
    textTransform: "uppercase",
    userSelect: "none",
    WebkitUserSelect: "none",
    fontWeight: theme.font.weight.semibold,
    justifyContent: "center",
    fontSize: "0.625rem",
    ":first-child": {
      borderTopLeftRadius: 2,
      borderBottomLeftRadius: 2,
    },
    ":last-child": {
      borderTopRightRadius: 2,
      borderBottomRightRadius: 2,
    },
  },
  variants: {
    type: {
      created: {
        backgroundColor: `hsla(${theme.color.blue.l2}, 100%)`,
      },
      deleted: {
        backgroundColor: `hsla(${theme.color.red.l1}, 100%)`,
      },
      updated: {
        backgroundColor: `hsla(${theme.color.brand.l2}, 100%)`,
      },
      same: {
        backgroundColor: theme.color.background.selected,
      },
    },
  },
});

const UpdateNoChanges = styled("span", {
  base: {
    ...utility.text.label,
    fontSize: theme.font.size.mono_sm,
    color: theme.color.text.dimmed.base,
  },
});

const UpdateActions = styled(UpdateCol, {
  base: {
    ...utility.row(3),
    alignItems: "center",
    justifyContent: "flex-end",
  },
});

const UpdateSource = styled(UpdateCol, {
  base: {
    ...utility.stack(3),
    alignItems: "flex-end",
  },
});

const UpdateCmd = styled("span", {
  base: {
    fontSize: theme.font.size.mono_sm,
    fontWeight: theme.font.weight.medium,
    fontFamily: theme.font.family.code,
    color: theme.color.text.primary.base,
  },
});

const UpdateTime = styled("span", {
  base: {
    fontSize: theme.font.size.sm,
    color: theme.color.text.dimmed.base,
  },
});

// ...workspaceID,
// stageID: cuid("state_id").notNull(),
// command: mysqlEnum("command", [
//   "deploy",
//   "refresh",
//   "remove",
//   "edit",
// ]).notNull(),
// source: json("source").notNull(),
// ...timestamps,
// timeStarted: timestamp("time_started"),
// timeCompleted: timestamp("time_completed"),
// resourceDeleted: int("resource_deleted"),
// resourceCreated: int("resource_created"),
// resourceUpdated: int("resource_updated"),
// resourceSame: int("resource_same"),
// errors: int("errors"),

/**
 * CLI
 * - Date
 * - Link to view state
 * - Duration
 * - Status: started, finished,
 * - Source: CLI
 * - Command: Update, Refresh, Remove, Edit
 *
 * CI
 * - Date
 * - Link to commit
 * - Link to branch
 * - Commit message
 * - Github user
 * - Github avatar
 * - Success/Failure/In Progress/Queued/Cancelled
 * - Link to view state
 * - Link to view workflow logs
 */
type UpdateProps = {
  id: string;
  errors?: number;
  timeStarted?: string;
  timeQueued?: string;
  source: "ci" | "cli";
  resourceSame?: number;
  timeCanceled?: string;
  timeCompleted?: string;
  same?: number;
  created?: number;
  updated?: number;
  deleted?: number;
  command: "deploy" | "refresh" | "remove" | "edit";
};
function Update(props: UpdateProps) {
  createEffect(() => console.log({ ...props }));
  const status = createMemo(() =>
    props.timeCompleted
      ? props.errors
        ? "error"
        : "updated"
      : props.timeCanceled
        ? "canceled"
        : props.timeQueued
          ? "queued"
          : "updating",
  );

  return (
    <UpdateRoot>
      <UpdateStatus>
        <UpdateStatusIcon status={status()} />
        <Stack space="2">
          <UpdateLink href={props.id}>
            <UpdateLinkPrefix>#</UpdateLinkPrefix>
            {props.id}
          </UpdateLink>
          <UpdateStatusCopy>{STATUS_MAP[status()]}</UpdateStatusCopy>
        </Stack>
      </UpdateStatus>
      <UpdateRightCol>
        <ChangeLegend
          same={props.same}
          created={props.created}
          updated={props.updated}
          deleted={props.deleted}
        />
        <UpdateActions>
          <UpdateSource>
            <UpdateCmd>{CMD_MAP[props.command]}</UpdateCmd>
            <Show when={props.timeStarted}>
              <UpdateTime
                title={DateTime.fromISO(props.timeStarted!).toLocaleString(
                  DateTime.DATETIME_FULL,
                )}
              >
                {formatSinceTime(DateTime.fromISO(props.timeStarted!).toSQL()!)}
              </UpdateTime>
            </Show>
          </UpdateSource>
          <Dropdown
            size="sm"
            icon={<IconEllipsisVertical width={18} height={18} />}
          >
            <Dropdown.Item disabled={status() !== "updated"}>
              View State
            </Dropdown.Item>
            <Show when={props.source === "ci"}>
              <Dropdown.Seperator />
              <Dropdown.Item>View Logs</Dropdown.Item>
            </Show>
          </Dropdown>
        </UpdateActions>
      </UpdateRightCol>
    </UpdateRoot>
  );
}

type ChangeLegendProps = {
  same?: number;
  created?: number;
  updated?: number;
  deleted?: number;
};
function ChangeLegend(props: ChangeLegendProps) {
  const same = () => props.same! ?? 0;
  const created = () => props.created! ?? 0;
  const updated = () => props.updated! ?? 0;
  const deleted = () => props.deleted! ?? 0;

  const total = () => same() + created() + updated() + deleted();

  const widths = createMemo(() => {
    const nonZero = [same(), created(), updated(), deleted()].filter((n) => n !== 0).length;

    let sameWidth = Math.ceil(same() / total() * LEGEND_WIDTH / 4) * 4;
    let createdWidth = Math.ceil(created() / total() * LEGEND_WIDTH / 4) * 4;
    let updatedWidth = Math.ceil(updated() / total() * LEGEND_WIDTH / 4) * 4;
    let deletedWidth = Math.ceil(deleted() / total() * LEGEND_WIDTH / 4) * 4;

    const calculatedTotalWidth = sameWidth + createdWidth + updatedWidth + deletedWidth;
    const widthDifference = LEGEND_WIDTH - ((nonZero - 1) + calculatedTotalWidth);

    if (widthDifference !== 0) {
      const maxWidth = Math.max(sameWidth, createdWidth, updatedWidth, deletedWidth);
      if (maxWidth === sameWidth) {
        sameWidth += widthDifference;
      } else if (maxWidth === createdWidth) {
        createdWidth += widthDifference;
      } else if (maxWidth === updatedWidth) {
        updatedWidth += widthDifference;
      } else if (maxWidth === deletedWidth) {
        deletedWidth += widthDifference;
      }
    }
    return {
      same: sameWidth,
      created: createdWidth,
      updated: updatedWidth,
      deleted: deletedWidth,
    };
  });

  return (
    <Show when={total() > 0} fallback={
      <UpdateNoChanges>No changes</UpdateNoChanges>
    }>
      <UpdateChangeTagsRoot>
        <Show when={created() !== 0}>
          <UpdateChangeTag
            type="created"
            title={`${countCopy(created())} added`}
            style={{ width: `${widths().created}px` }}
          />
        </Show>
        <Show when={deleted() !== 0}>
          <UpdateChangeTag
            type="deleted"
            title={`${countCopy(deleted())} deleted`}
            style={{ width: `${widths().deleted}px` }}
          />
        </Show>
        <Show when={updated() !== 0}>
          <UpdateChangeTag
            type="updated"
            title={`${countCopy(updated())} updated`}
            style={{ width: `${widths().updated}px` }}
          />
        </Show>
        <Show when={same() !== 0}>
          <UpdateChangeTag
            type="same"
            title={`${countCopy(same())} unchanged`}
            style={{ width: `${widths().same}px` }}
          />
        </Show>
      </UpdateChangeTagsRoot>
    </Show>
  );
}

export function Updates() {
  const rep = useReplicache();
  const ctx = useStageContext();
  const updates = StateUpdateStore.forStage.watch(rep, () => [ctx.stage.id]);
  console.log({ updates: updates() });
  return (
    <Content>
      <div>
        <For
          each={sortBy(updates(), [(item) => item.time.started || "", "desc"])}
        >
          {(item, index) => (
            <Update
              id={(updates().length - index()).toString()}
              errors={item.errors}
              command={item.command}
              source={item.source.type}
              timeStarted={item.time.started}
              timeCompleted={item.time.completed}
              same={item.resource.same}
              created={item.resource.created}
              updated={item.resource.updated}
              deleted={item.resource.deleted}
            />
          )}
        </For>
      </div>
    </Content>
  );
}

function countCopy(count?: number) {
  return count! > 1 ? `${count} resources` : "1 resource";
}
