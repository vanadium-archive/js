// Command test_serviced is an implementation of the test_service service.
package main

import (
	"fmt"
	"log"

	"v.io/core/veyron/lib/signals"
	_ "v.io/core/veyron/profiles"
	"v.io/core/veyron2/rt"
	"v.io/core/veyron2/vlog"
)

func main() {
	// Create the runtime
	r, err := rt.New()
	if err != nil {
		vlog.Fatalf("Could not initialize runtime: %s", err)
	}
	defer r.Cleanup()

	ctx := r.NewContext()

	s, endpoint, err := StartServer(ctx)
	if err != nil {
		log.Fatal("", err)
	}
	defer s.Stop()

	fmt.Printf("Listening at: %v\n", endpoint)
	<-signals.ShutdownOnSignals(ctx)
}
