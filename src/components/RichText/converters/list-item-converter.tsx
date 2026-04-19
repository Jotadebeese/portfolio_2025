import InteractiveChecklistItem from "./interactive-checklist-item";

export const listItemConverter = {
  listitem: ({ node, nodesToJSX }: any) => {
    if (typeof node.checked === "boolean") {
      return (
        <InteractiveChecklistItem initialChecked={node.checked}>
          {nodesToJSX({ nodes: node.children })}
        </InteractiveChecklistItem>
      );
    }
    return <li>{nodesToJSX({ nodes: node.children })}</li>;
  },
};
