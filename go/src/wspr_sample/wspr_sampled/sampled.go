package main

import (
	"fmt"
	"strings"

	"veyron.io/veyron/veyron2"
	"veyron.io/veyron/veyron2/ipc"
	"veyron.io/veyron/veyron2/naming"
	"veyron.io/veyron/veyron2/security"

	"wspr_sample"
)

type sampleDispatcher struct {
	cache           interface{}
	errorThrower    interface{}
	cancelCollector interface{}
}

func (sd *sampleDispatcher) Lookup(suffix, method string) (ipc.Invoker, security.Authorizer, error) {
	if strings.HasPrefix(suffix, "cache") {
		return ipc.ReflectInvoker(sd.cache), nil, nil
	}

	if strings.HasPrefix(suffix, "errorThrower") {
		return ipc.ReflectInvoker(sd.errorThrower), nil, nil
	}

	if strings.HasPrefix(suffix, "cancel") {
		return ipc.ReflectInvoker(sd.cancelCollector), nil, nil
	}

	return ipc.ReflectInvoker(sd.cache), nil, nil
}

func StartServer(r veyron2.Runtime) (ipc.Server, naming.Endpoint, error) {
	// Create a new server instance.
	s, err := r.NewServer()
	if err != nil {
		return nil, nil, fmt.Errorf("failure creating server: %v", err)
	}

	disp := &sampleDispatcher{
		cache:           wspr_sample.NewServerCache(NewCached()),
		errorThrower:    wspr_sample.NewServerErrorThrower(NewErrorThrower()),
		cancelCollector: wspr_sample.NewServerCancelCollector(NewCancelCollector()),
	}

	// Create an endpoint and begin listening.
	endpoint, err := s.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		return nil, nil, fmt.Errorf("error listening to service: %v", err)
	}

	// Publish the services. This will register them in the mount table and
	// maintain the registration until StopServing is called.
	for _, service := range []string{"sample", "cache", "cancel"} {
		if err := s.Serve(service, disp); err != nil {
			return nil, nil, fmt.Errorf("error publishing service '%s': %v", service, err)
		}
	}

	return s, endpoint, nil
}
