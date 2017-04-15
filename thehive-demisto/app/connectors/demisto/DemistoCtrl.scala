package connectors.demisto

import javax.inject.{ Inject, Singleton }

import scala.concurrent.ExecutionContext
import scala.reflect.runtime.universe

import play.api.Logger
import play.api.http.Status
import play.api.libs.json.{ JsArray, Json }
import play.api.mvc.{ Action, Controller }
import play.api.routing.SimpleRouter
import play.api.routing.sird.{ GET, POST, UrlContext }

import org.elastic4play.{ NotFoundError, Timed }
import org.elastic4play.BadRequestError
import org.elastic4play.JsonFormat.tryWrites
import org.elastic4play.controllers.{ Authenticated, FieldsBodyParser, Renderer }
import org.elastic4play.models.JsonFormat.baseModelEntityWrites
import org.elastic4play.services.{ QueryDSL, QueryDef, Role }
import org.elastic4play.services.Agg
import org.elastic4play.services.JsonFormat.{ aggReads, queryReads }

import connectors.Connector
import services.CaseSrv
import org.elastic4play.utils.Collection
import play.api.libs.json.JsString

@Singleton
class DemistoCtrl @Inject() (
    demistoSrv: DemistoSrv,
    caseSrv: CaseSrv,
    authenticated: Authenticated,
    renderer: Renderer,
    fieldsBodyParser: FieldsBodyParser,
    implicit val ec: ExecutionContext) extends Controller with Connector with Status {
  val name = "demisto"
  val log = Logger(getClass)
  val router = SimpleRouter {
    case GET(p"/_update")                    ⇒ update
    case POST(p"/_search")                   ⇒ find
    case POST(p"/_stats")                    ⇒ stats
    case GET(p"/get/$demistoId<[^/]*>")      ⇒ getEvent(demistoId)
    case GET(p"/ignore/$demistoId<[^/]*>")   ⇒ ignore(demistoId)
    case GET(p"/follow/$demistoId<[^/]*>")   ⇒ follow(demistoId)
    case GET(p"/unfollow/$demistoId<[^/]*>") ⇒ unfollow(demistoId)
    case POST(p"/case/$demistoId<[^/]*>")    ⇒ createCase(demistoId)
    case r                                   ⇒ throw NotFoundError(s"${r.uri} not found")
  }

  @Timed
  def update = authenticated(Role.read).async { implicit request ⇒
    demistoSrv.update()
      .map { m ⇒ Ok(Json.toJson(m)) }
  }

  @Timed
  def find = authenticated(Role.read).async(fieldsBodyParser) { implicit request ⇒
    val query = request.body.getValue("query").fold[QueryDef](QueryDSL.any)(_.as[QueryDef])
    val range = request.body.getString("range")
    val sort = request.body.getStrings("sort").getOrElse(Seq("-eventId"))

    val (events, total) = demistoSrv.find(query, range, sort)
    renderer.toOutput(OK, events, total)
  }

  @Timed
  def stats = authenticated(Role.read).async(fieldsBodyParser) { implicit request ⇒
    val query = request.body.getValue("query").fold[QueryDef](QueryDSL.any)(_.as[QueryDef])
    val aggs = request.body.getValue("stats").getOrElse(throw BadRequestError("Parameter \"stats\" is missing")).as[Seq[Agg]]
    demistoSrv.stats(query, aggs).map(s ⇒ Ok(s))
  }

  @Timed
  def ignore(demistoId: String) = authenticated(Role.write).async { implicit request ⇒
    demistoSrv.ignoreEvent(demistoId).map(_ ⇒ NoContent)
  }

  @Timed
  def follow(demistoId: String) = authenticated(Role.write).async { implicit request ⇒
    demistoSrv.setFollowEvent(demistoId, true).map(_ ⇒ NoContent)
  }

  @Timed
  def unfollow(demistoId: String) = authenticated(Role.write).async { implicit request ⇒
    demistoSrv.setFollowEvent(demistoId, false).map(_ ⇒ NoContent)
  }

  @Timed
  def createCase(demistoId: String) = authenticated(Role.write).async { implicit request ⇒
    for {
      (caze, artifacts) ← demistoSrv.createCase(demistoId)
      (importedArtifacts, importArtifactErrors) = Collection.partitionTry(artifacts)
      _ = log.info(s"${importedArtifacts.size} aritfact(s) imported")
      _ = if (!importArtifactErrors.isEmpty) log.warn(s"artifact import errors : ${importArtifactErrors.map(t ⇒ t.getMessage + ":" + t.getStackTrace().mkString("", "\n\t", "\n"))}")
    } yield renderer.toOutput(OK, caze)
  }

  @Timed
  def getEvent(demistoId: String) = authenticated(Role.write).async { implicit request ⇒
    for {
      demisto ← demistoSrv.getDemisto(demistoId)
      attributes ← demistoSrv.getAttributes(demisto)
      fileAttributes = attributes.collect {
        case a if a.tpe == "malware-sample" || a.tpe == "attachment" ⇒ Json.obj(
          "dataType" → "file",
          "message" → a.comment,
          "tags" → Seq(s"src:${demisto.org()}"),
          "data" → JsString(a.value))
      }
    } yield renderer.toOutput(OK, demisto.toJson + ("attributes" → JsArray(fileAttributes ++ attributes.flatMap(a ⇒ demistoSrv.convertAttribute(a)))))
  }
}
