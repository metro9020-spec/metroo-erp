const fs = require("fs");
let main = fs.readFileSync("src/main.js", "utf8");

const oldCode = `        modalRoot.appendChild(child);
      });
    }
  });
}

// Routes Mapping`;

if (main.includes(oldCode)) {
  console.log("Found");
  main = main.replace(oldCode, `        modalRoot.appendChild(child);
      });
    }
  });
  } // polyfill
}

// Routes Mapping`);
} else {
  console.log("Not found");
}

fs.writeFileSync("src/main.js", main);
