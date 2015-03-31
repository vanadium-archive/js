##Vanadium JavaScript API
Vanadium JavaScript provides JavaScript APIs into the Vanadium application environment that work in NodeJS and Chrome browser and enable development of Vanadium-based applications in JavaScript.

Please see [http://v.io](https://staging.v.io/) for details about
Vanadium.

##[Vanadium Module](./module-vanadium.html)
[Vanadium module](./module-vanadium.html) is the entry point to the API contains
all the public functions and types grouped in logical namespaces.


[Runtime](./Runtime.html) as returned by the
[init](module-vanadium.html#.init) function, is one of the main
types that includes functions for creating servers and clients.
```
var vanadium = require('vanadium'); // Import Vanadium module
vanadium.init(function(err, runtime) { // Initialize Vanadium
  if(err) {
    // Handle initialization errors
  }

  // Use runtime
});
```
##Tutorials
Please see tutorials section of [v.io website](https://www.v.io/tutorials/javascript/overview.html) for JavaScript tutorials.