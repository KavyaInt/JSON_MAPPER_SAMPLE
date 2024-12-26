import React, { useState } from "react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { useDrag, useDrop } from "react-dnd";

const MapPrototype = () => {
  const [sourceTree, setSourceTree] = useState(null);
  const [targetTree, setTargetTree] = useState(null);
  const [mappings, setMappings] = useState([]);
  const [resultantTarget, setResultantTarget] = useState({});
  const [pendingFullName, setPendingFullName] = useState({ firstName: null, lastName: null });

  const ITEM_TYPE = "TREE_ITEM";

  // Recursive function to parse JSON into tree structure
  const parseJsonToTree = (data, nodeName = "root") => {
    if (Array.isArray(data)) {
      return {
        name: `${nodeName} (Array)`,
        type: "folder",
        children: data.map((item, index) =>
          parseJsonToTree(item, `Index ${index}`)
        ),
      };
    }
    if (typeof data === "object" && data !== null) {
      return {
        name: `${nodeName} (Object)`,
        type: "folder",
        children: Object.entries(data).map(([key, value]) =>
          parseJsonToTree(value, key)
        ),
      };
    }
    return { name: nodeName, type: "file", value: data };
  };

  const handleSourceFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const data = JSON.parse(e.target.result);
      setSourceTree(parseJsonToTree(data, "Source"));
    };
    reader.readAsText(file);
  };

  const handleTargetFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const data = JSON.parse(e.target.result);
      setTargetTree(parseJsonToTree(data, "Target"));
      setResultantTarget({});
    };
    reader.readAsText(file);
  };

  const updateResultantTarget = (targetPath, sourceValue) => {
    setResultantTarget((prev) => {
      const updated = { ...prev };
      const keys = targetPath.split(".");
      let current = updated;

      keys.forEach((key, index) => {
        if (index === keys.length - 1) {
          current[key] = sourceValue;
        } else {
          current[key] = current[key] || {};
          current = current[key];
        }
      });

      return updated;
    });
  };

  const handleMappingDrop = (sourceNode, targetNode) => {
    const sourcePath = sourceNode.path;
    const sourceValue = sourceNode.value;
    const targetPath = targetNode.path;

    // Check for fullName mapping scenario
    if (sourcePath.includes("firstName") || sourcePath.includes("lastName")) {
      const isFirstName = sourcePath.includes("firstName");

      // Update pending mapping
      setPendingFullName((prev) => {
        const updated = { ...prev };
        if (isFirstName) updated.firstName = sourceValue;
        else updated.lastName = sourceValue;

        // If both firstName and lastName are mapped, combine them into fullName
        if (updated.firstName && updated.lastName) {
          const combinedFullName = `${updated.firstName} ${updated.lastName}`;
          setMappings((prevMappings) => [
            ...prevMappings,
            { sourcePath: "fullName", targetPath, sourceValue: combinedFullName },
          ]);
          updateResultantTarget(targetPath, combinedFullName);

          // Clear pending mapping
          return { firstName: null, lastName: null };
        }
        return updated;
      });
    } else {
      // Regular mapping
      setMappings((prevMappings) => [
        ...prevMappings,
        { sourcePath, targetPath, sourceValue },
      ]);
      updateResultantTarget(targetPath, sourceValue);
    }
  };

  const handleDeleteMapping = (index) => {
    // Remove the mapping from `mappings`
    const deletedMapping = mappings[index];

    // Remove the corresponding key from `resultantTarget`
    setMappings((prevMappings) => prevMappings.filter((_, i) => i !== index));

    setResultantTarget((prev) => {
      const updated = { ...prev };
      const keys = deletedMapping.targetPath.split(".");
      let current = updated;

      // Delete the key from resultant target
      keys.forEach((key, index) => {
        if (index === keys.length - 1) {
          delete current[key];
        } else {
          current = current[key];
        }
      });

      return updated;
    });
  };

  const renderTree = (node, parentPath = "", side = "source") => {
    const currentPath = `${parentPath}${parentPath ? "." : ""}${node.name}`;

    return (
      <CollapsibleTreeItem
        key={currentPath}
        node={{ ...node, path: currentPath }}
        onDrop={handleMappingDrop}
      >
        {node.children &&
          node.children.map((child) => renderTree(child, currentPath, side))}
      </CollapsibleTreeItem>
    );
  };

  const CollapsibleTreeItem = ({ node, onDrop, children }) => {
    const [isOpen, setIsOpen] = useState(true);

    const toggleOpen = () => setIsOpen(!isOpen);

    const [, drag] = useDrag({
      type: ITEM_TYPE,
      item: { data: node },
    });

    const [, drop] = useDrop({
      accept: ITEM_TYPE,
      drop: (item) => {
        onDrop(item.data, node);
      },
    });

    return (
      <div ref={(ref) => drag(drop(ref))} style={{ margin: "5px 0", cursor: "pointer" }}>
        <div style={{ display: "flex", alignItems: "center" }} onClick={toggleOpen}>
          <span>{isOpen ? "📂" : "📁"}</span>
          <span style={{ marginLeft: "10px" }}>{node.name}</span>
        </div>
        {isOpen && <div style={{ marginLeft: "20px" }}>{children}</div>}
      </div>
    );
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div style={{ padding: "1rem", backgroundColor: "#E6E6FA", height: "100vh", display: "flex", flexDirection: "column" }}>
        <h2 style={{ textAlign: "center", marginBottom: "1rem" }}>Field Mapping Interface</h2>

        <div style={{ display: "flex", gap: "2rem", justifyContent: "space-between", marginTop: "1rem" }}>
          <div style={{ flex: 1, textAlign: "center" }}>
            <h3>Source JSON</h3>
            <input type="file" accept=".json" onChange={handleSourceFileUpload} />
            <div style={{ height: "300px", overflowY: "auto", border: "1px solid #ddd", backgroundColor: "#fff", borderRadius: "12px", padding: "1rem" }}>
              {sourceTree ? renderTree(sourceTree, "", "source") : <p>No source file loaded.</p>}
            </div>
          </div>

          <div style={{ flex: 1, textAlign: "center" }}>
            <h3>Target JSON</h3>
            <input type="file" accept=".json" onChange={handleTargetFileUpload} />
            <div style={{ height: "300px", overflowY: "auto", border: "1px solid #ddd", backgroundColor: "#fff", borderRadius: "12px", padding: "1rem" }}>
              {targetTree ? renderTree(targetTree, "", "target") : <p>No target file loaded.</p>}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: "2rem", justifyContent: "space-between", marginTop: "2rem" }}>
          <div style={{ flex: 1, textAlign: "center", backgroundColor: "#fff", borderRadius: "12px", padding: "1rem" }}>
            <h3>Current Mappings</h3>
            {mappings.length > 0 ? (
              <ul style={{ listStyleType: "none", padding: 0 }}>
                {mappings.map((mapping, index) => (
                  <li key={index} style={{ marginBottom: "10px", display: "flex", justifyContent: "space-between" }}>
                    <span>{`${mapping.sourcePath} → ${mapping.targetPath}`}</span>
                    <button onClick={() => handleDeleteMapping(index)} style={{ color: "red", background: "none", border: "none" }}>
                      🗑️
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p>No mappings added.</p>
            )}
          </div>

          <div style={{ flex: 1, textAlign: "center", backgroundColor: "#fff", borderRadius: "12px", padding: "1rem" }}>
            <h3>Resultant Target Block</h3>
            <div style={{ background: "#f4f4f4", padding: "1rem", border: "1px solid #ddd", borderRadius: "12px", marginTop: "10px", textAlign: "left", whiteSpace: "pre-wrap", wordWrap: "break-word" }}>
              {JSON.stringify(resultantTarget, null, 2)}
            </div>
          </div>
        </div>
      </div>
    </DndProvider>
  );
};

export default MapPrototype;
