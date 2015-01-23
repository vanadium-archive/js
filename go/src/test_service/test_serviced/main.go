// Command test_serviced is an implementation of the test_service service.
package main

import (
	"fmt"
	"log"

	"v.io/core/veyron/lib/signals"
	_ "v.io/core/veyron/profiles"
	"v.io/core/veyron2"
)

func main() {
	ctx, shutdown := veyron2.Init()
	defer shutdown()

	s, endpoint, err := StartServer(ctx)
	if err != nil {
		log.Fatal("", err)
	}
	defer s.Stop()

	fmt.Printf("Listening at: %v\n", endpoint)
	<-signals.ShutdownOnSignals(ctx)
}
