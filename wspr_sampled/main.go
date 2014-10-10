// Command wspr_sampled is an implementation of the wspr_sample service.
package main

import (
	"fmt"
	"log"

	"veyron.io/veyron/veyron/lib/signals"
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
	<-signals.ShutdownOnSignals()
}
