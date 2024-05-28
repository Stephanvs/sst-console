import { withActor } from "@console/core/actor";
import { Run } from "@console/core/run/run";
import { EventHandler } from "sst/node/event-bus";

export const handler = EventHandler(Run.Events.Started, async (evt) => {
  const { workspaceID, runID, awsRequestId, logGroup, logStream } =
    evt.properties;
  await withActor(
    {
      type: "system",
      properties: {
        workspaceID,
      },
    },
    () => Run.started({ runID, awsRequestId, logGroup, logStream })
  );
});
