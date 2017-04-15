package connectors.demisto

import javax.inject.Singleton

import play.api.{ Configuration, Environment, Logger }

import connectors.ConnectorModule

@Singleton
class DemistoConnector(
    environment: Environment,
    configuration: Configuration) extends ConnectorModule {
  val log = Logger(getClass)

  def configure() {
    try {
      //      val demistoConfig = DemistoConfig(configuration)
      //      bind[DemistoConfig].toInstance(demistoConfig)
      bind[DemistoSrv].asEagerSingleton()
      registerController[DemistoCtrl]
    }
    catch {
      case t: Throwable ⇒ log.error("MISP connector is disabled because its configuration is invalid", t)
    }
  }
}