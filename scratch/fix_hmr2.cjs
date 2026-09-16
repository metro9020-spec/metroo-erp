const fs = require("fs");
let main = fs.readFileSync("src/main.js", "utf8");

main = main.replace(
  `        modalRoot.appendChild(child);
      });
    }
  });
}

// Routes Mapping`,
  `        modalRoot.appendChild(child);
      });
    }
  });
  } // end if polyfill
}

// Routes Mapping`
);

fs.writeFileSync("src/main.js", main);
console.log("Fixed bracket");
