// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

// Command test_serviced is an implementation of the test_service service.
package main

import (
	"fmt"
	"log"

	"v.io/v23"
	"v.io/x/ref/lib/flags"
	"v.io/x/ref/lib/signals"
	_ "v.io/x/ref/runtime/factories/generic"
	"v.io/x/ref/test"
)

func main() {
	flags.SetDefaultHostPort("127.0.0.1:0")
	ctx, shutdown := test.V23Init()
	defer shutdown()

	ctx, s, err := v23.WithNewDispatchingServer(ctx, "test_service", NewDispatcher())
	if err != nil {
		log.Fatalf("failure creating server: %v", err)
	}
	endpoint := s.Status().Endpoints[0]
	fmt.Printf("Listening at: %v\n", endpoint)
	<-signals.ShutdownOnSignals(ctx)
}
