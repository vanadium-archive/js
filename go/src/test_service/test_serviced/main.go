// Command test_serviced is an implementation of the test_service service.
package main

import (
	"fmt"
	"log"

	"veyron.io/veyron/veyron/lib/signals"
	_ "veyron.io/veyron/veyron/profiles"
	"veyron.io/veyron/veyron2/rt"
)

func main() {
	// Create the runtime
	r := rt.Init()
	defer r.Cleanup()

	s, endpoint, err := StartServer(r)
	if err != nil {
		log.Fatal("", err)
	}
	defer s.Stop()

	fmt.Printf("Listening at: %v\n", endpoint)
	<-signals.ShutdownOnSignals(r)
}
