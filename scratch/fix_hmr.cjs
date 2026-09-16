const fs = require("fs");
let main = fs.readFileSync("src/main.js", "utf8");

main = main.replace(
  /Object\.defineProperty\(modalRoot, "innerHTML", \{/,
  `if (!modalRoot.__hasModalPolyfill) {
    modalRoot.__hasModalPolyfill = true;
    Object.defineProperty(modalRoot, "innerHTML", {`
);

// We need to close the if statement. Let`s find the end of that block.
main = main.replace(
  /        modalRoot\.appendChild\(child\);\n      \}\);\n    \}\n  \}\);\n\}/,
  `        modalRoot.appendChild(child);
      });
    }
  });
  } // end if polyfill
}`
);

fs.writeFileSync("src/main.js", main);
console.log("Fixed HMR polyfill error");
